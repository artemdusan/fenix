// constants.ts

// Define the Language interface
interface Language {
  code: string;
  name: string;
}

// Export the languages array with explicit typing
export const languages: Language[] = [
  { code: "en", name: "English" },
  { code: "pl", name: "Polish" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ar", name: "Arabic" },
];
