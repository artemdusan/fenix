import React, { useState, useEffect, useRef } from "react";
import "./styles/Login.css";
import {
  openDB,
  saveLoginInfo,
  getLoginInfo,
  saveSessionInfo,
  getSessionInfo,
  clearSessionInfo,
} from "../../services/Library/databaseService";
import { syncBooks } from "../../services/Library/syncBooksService";

function Login({ onClose }) {
  const [serverAddress, setServerAddress] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const modalRef = useRef(null);

  const checkServerValidity = async (
    normalizedServerAddress,
    token,
    sessionInfo
  ) => {
    try {
      if (!normalizedServerAddress || normalizedServerAddress === "/") {
        console.log("No valid server address, marking session as invalid");
        await saveSessionInfo({ expiresAt: Date.now(), token: null });
        setIsLoggedIn(false);
        setConnectionError(null);
        return false;
      }

      console.log(
        "Checking session validity at:",
        `${normalizedServerAddress}auth/check-validity`
      );
      const response = await fetch(
        `${normalizedServerAddress}auth/check-validity`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      console.log(
        "Session validity response:",
        data,
        "Status:",
        response.status
      );

      if (data.isValid !== undefined) {
        if (!data.isValid) {
          console.log("Session invalid, updating expiresAt");
          await saveSessionInfo({ expiresAt: Date.now(), token: null });
          setIsLoggedIn(false);
          setConnectionError(null);
        } else {
          setConnectionError(null);
        }
        return data.isValid;
      } else {
        console.error("Unexpected response from check-validity:", data);
        await saveSessionInfo({ expiresAt: Date.now(), token: null });
        setIsLoggedIn(false);
        setConnectionError(null);
        return false;
      }
    } catch (error) {
      console.error("Error checking session validity:", error);
      const now = Date.now();
      if (sessionInfo && sessionInfo.expiresAt > now && sessionInfo.token) {
        console.log(
          "No internet, but local session is valid until:",
          sessionInfo.expiresAt
        );
        setIsLoggedIn(true);
        setConnectionError("Connection error: Using cached session");
        return true;
      } else {
        console.log("No internet and local session expired or missing");
        await saveSessionInfo({ expiresAt: Date.now(), token: null });
        setIsLoggedIn(false);
        setConnectionError(null);
        return false;
      }
    }
  };

  useEffect(() => {
    const checkSessionAndLoadInfo = async () => {
      try {
        const loginInfo = await getLoginInfo();
        let normalizedServerAddress = "";
        if (loginInfo) {
          normalizedServerAddress = loginInfo.serverAddress.startsWith("http")
            ? loginInfo.serverAddress
            : `https://${loginInfo.serverAddress}`;
          normalizedServerAddress = normalizedServerAddress.endsWith("/")
            ? normalizedServerAddress
            : `${normalizedServerAddress}/`;
          setServerAddress(normalizedServerAddress);
          setEmail(loginInfo.email || "");
        }

        const sessionInfo = await getSessionInfo();
        const now = Date.now();
        if (sessionInfo && sessionInfo.expiresAt > now && sessionInfo.token) {
          console.log(
            "Session valid based on local timestamp:",
            sessionInfo.expiresAt
          );
          setIsLoggedIn(true);
          if (normalizedServerAddress) {
            await checkServerValidity(
              normalizedServerAddress,
              sessionInfo.token,
              sessionInfo
            );
          }
        } else {
          console.log("Local session expired or missing");
          setIsLoggedIn(false);
          setConnectionError(null);
        }
      } catch (error) {
        console.error("Error checking session or loading login info:", error);
        setIsLoggedIn(false);
        setConnectionError(null);
      }
    };
    checkSessionAndLoadInfo();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(null);
    setConnectionError(null);

    let normalizedServerAddress = serverAddress;
    if (!normalizedServerAddress.startsWith("http")) {
      normalizedServerAddress = `https://${normalizedServerAddress}`;
    }
    normalizedServerAddress = normalizedServerAddress.endsWith("/")
      ? normalizedServerAddress
      : `${normalizedServerAddress}/`;

    try {
      console.log(
        "Attempting login at:",
        `${normalizedServerAddress}auth/login`
      );
      const response = await fetch(`${normalizedServerAddress}auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log("Login response:", data);
      if (response.ok) {
        await saveLoginInfo({ serverAddress: normalizedServerAddress, email });
        await saveSessionInfo({ expiresAt: data.expiresAt, token: data.token });
        setServerAddress(normalizedServerAddress);
        setIsLoggedIn(true);
        checkServerValidity(normalizedServerAddress, data.token, {
          expiresAt: data.expiresAt,
          token: data.token,
        });
      } else {
        setLoginError(data.error || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      setLoginError("Network or server error");
    }
  };

  const handleLogout = async () => {
    try {
      const normalizedServerAddress = serverAddress.endsWith("/")
        ? serverAddress
        : `${serverAddress}/`;
      const sessionInfo = await getSessionInfo();
      if (!sessionInfo || !sessionInfo.token) {
        console.log("No session info, clearing local session");
        await clearSessionInfo();
      } else if (navigator.onLine) {
        console.log("Online, attempting server-side logout");
        const response = await fetch(`${normalizedServerAddress}auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionInfo.token}`,
          },
        });
        console.log("Logout response:", await response.json());
        if (!response.ok) {
          setLoginError("Logout failed");
          return;
        }
      } else {
        console.log("Offline, skipping server-side logout");
      }

      await clearSessionInfo();
      setIsLoggedIn(false);
      setPassword("");
      setConnectionError(null);
      setLoginError(null);

      const loginInfo = await getLoginInfo();
      if (loginInfo) {
        const normalizedServerAddress = loginInfo.serverAddress.startsWith(
          "http"
        )
          ? loginInfo.serverAddress
          : `https://${loginInfo.serverAddress}`;
        setServerAddress(
          normalizedServerAddress.endsWith("/")
            ? normalizedServerAddress
            : `${normalizedServerAddress}/`
        );
        setEmail(loginInfo.email || "");
      }
    } catch (error) {
      console.error("Logout error:", error);
      await clearSessionInfo();
      setIsLoggedIn(false);
      setPassword("");
      setConnectionError(null);
      setLoginError(null);

      const loginInfo = await getLoginInfo();
      if (loginInfo) {
        const normalizedServerAddress = loginInfo.serverAddress.startsWith(
          "http"
        )
          ? loginInfo.serverAddress
          : `https://${loginInfo.serverAddress}`;
        setServerAddress(
          normalizedServerAddress.endsWith("/")
            ? normalizedServerAddress
            : `${normalizedServerAddress}/`
        );
        setEmail(loginInfo.email || "");
      }
    }
  };

  const handleLogoutAllDevices = async () => {
    try {
      const normalizedServerAddress = serverAddress.endsWith("/")
        ? serverAddress
        : `${serverAddress}/`;
      const sessionInfo = await getSessionInfo();
      if (!sessionInfo || !sessionInfo.token) {
        await clearSessionInfo();
      } else {
        const response = await fetch(
          `${normalizedServerAddress}auth/logout-all`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${sessionInfo.token}`,
            },
          }
        );
        console.log("Logout all devices response:", await response.json());
        if (!response.ok) {
          setLoginError("Logout from all devices failed");
          return;
        }
      }

      await clearSessionInfo();
      setIsLoggedIn(false);
      setPassword("");
      setConnectionError(null);
      setLoginError(null);

      const loginInfo = await getLoginInfo();
      if (loginInfo) {
        const normalizedServerAddress = loginInfo.serverAddress.startsWith(
          "http"
        )
          ? loginInfo.serverAddress
          : `https://${loginInfo.serverAddress}`;
        setServerAddress(
          normalizedServerAddress.endsWith("/")
            ? normalizedServerAddress
            : `${normalizedServerAddress}/`
        );
        setEmail(loginInfo.email || "");
      }
    } catch (error) {
      console.error("Logout all devices error:", error);
      setLoginError("Logout from all devices failed");
    }
  };

  const handleSync = async () => {
    setLoginError(null);
    setConnectionError(null);
    try {
      const sessionInfo = await getSessionInfo();
      if (!sessionInfo || !sessionInfo.token) {
        setLoginError("No valid session, please log in again");
        return;
      }

      const loginInfo = await getLoginInfo();
      if (!loginInfo?.serverAddress) {
        setLoginError("No server address configured");
        return;
      }

      let normalizedServerAddress = loginInfo.serverAddress;
      if (!normalizedServerAddress.startsWith("http")) {
        normalizedServerAddress = `https://${normalizedServerAddress}`;
      }
      normalizedServerAddress = normalizedServerAddress.endsWith("/")
        ? normalizedServerAddress
        : `${normalizedServerAddress}/`;

      // Perform sync using syncBooksService
      const syncResult = await syncBooks();
      if (!syncResult.success) {
        throw new Error(syncResult.error || "Sync failed");
      }
      console.log(
        "Sync completed successfully, newBookIds:",
        syncResult.newBookIds
      );

      // Dispatch booksSynced event with newBookIds (in case it wasn't dispatched)
      const event = new CustomEvent("booksSynced", {
        detail: { newBookIds: syncResult.newBookIds },
      });
      window.dispatchEvent(event);

      // Verify session validity post-sync
      const isValid = await checkServerValidity(
        normalizedServerAddress,
        sessionInfo.token,
        sessionInfo
      );
      if (!isValid) {
        setLoginError("Session expired during sync, please log in again");
        return;
      }

      setConnectionError(null);
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Sync error:", error);
      setLoginError("Failed to sync data");
      setConnectionError("Connection error: Unable to sync");
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-labelledby="login-modal-title"
    >
      <div className="modal-content" ref={modalRef}>
        <button
          className="modal-close-button"
          onClick={onClose}
          aria-label="Close login modal"
        >
          ×
        </button>
        <div className="login-form">
          {!isLoggedIn ? (
            <>
              <h2 className="login-form__title" id="login-modal-title">
                Login
              </h2>
              <div className="login-form__group">
                <label htmlFor="serverAddress" className="login-form__label">
                  Server Address
                </label>
                <input
                  type="text"
                  id="serverAddress"
                  value={serverAddress}
                  onChange={(e) => setServerAddress(e.target.value)}
                  placeholder="http://localhost:5001/user-dashboard-5ee1f/us-central1/api"
                  className="login-form__input"
                  required
                  aria-required="true"
                />
              </div>
              <div className="login-form__group">
                <label htmlFor="email" className="login-form__label">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="login-form__input"
                  required
                  aria-required="true"
                />
              </div>
              <div className="login-form__group">
                <label htmlFor="password" className="login-form__label">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="login-form__input"
                  required
                  aria-required="true"
                />
              </div>
              {loginError && <p className="login-form__error">{loginError}</p>}
              <button
                type="button"
                onClick={handleLogin}
                className="login-form__button"
              >
                Login
              </button>
            </>
          ) : (
            <>
              <h2 className="login-form__title" id="login-modal-title">
                {serverAddress}
              </h2>
              <div className="login-form__button-group">
                <button
                  onClick={handleLogout}
                  className="login-form__button login-form__button--secondary"
                >
                  Logout
                </button>
                <button
                  onClick={handleLogoutAllDevices}
                  className="login-form__button login-form__button--secondary"
                >
                  Logout from All Devices
                </button>
                <button onClick={handleSync} className="login-form__button">
                  Sync Now
                </button>
              </div>
              {loginError && <p className="login-form__error">{loginError}</p>}
              {connectionError && (
                <p className="login-form__error">{connectionError}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
