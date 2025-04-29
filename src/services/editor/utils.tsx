// utils.ts
import { languages } from "../../constants";

// Define the Language interface based on your constants (adjust if needed)
interface Language {
  code: string;
  name: string;
}

// Utility to convert HTML to plain text
export const htmlToText = (html: string): string => {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  const paragraphs = temp.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li");
  const textArray = Array.from(paragraphs)
    .map((p) => (p.textContent ?? "").trim())
    .filter((text) => text.length > 0);
  return textArray.length > 0 ? textArray.join("\n\n") : "";
};

// Utility to convert Blob to Base64 with resizing
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.src = reader.result as string; // Type assertion since result can be string or ArrayBuffer
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Failed to get 2D context"));
          return;
        }

        // Calculate the new dimensions while maintaining the aspect ratio
        const maxWidth = 200;
        const maxHeight = 300;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            width = maxWidth;
            height = Math.round(maxWidth * (img.height / img.width));
          } else {
            height = maxHeight;
            width = Math.round(maxHeight * (img.width / img.height));
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        const quality = 0.7;
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
        // Size in KB
        console.log(`Image size: ${(dataUrl.length / 1024).toFixed(2)} KB`);
      };
      img.onerror = () => reject(new Error("Image loading failed"));
    };
    reader.onerror = () => reject(new Error("File reading failed"));
    reader.readAsDataURL(blob);
  });
};

// Utility to get language name from code
export const getLanguageNameFromCode = (code: string): string => {
  const language = languages.find((lang: Language) => lang.code === code);
  return language ? language.name : code;
};
