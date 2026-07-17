import QRCode from "qrcode";
import "./styles.css";

import {
  translations,
  type CardFormat,
  type ContactType,
  type Language,
} from "./translations";

type FieldConfig = {
  inputType: HTMLInputElement["type"];
  inputMode: HTMLInputElement["inputMode"];
};

type StoredState = {
  language?: Language;
  format?: CardFormat;
  title?: string;
  kicker?: string;
  message?: string;
  footer?: string;
  showQrContext?: boolean;
  contactType?: ContactType;
  contactValue?: string;
  copyCount?: number;
  showCutLines?: boolean;
  safeMargin?: boolean;
  backgroundMode?: BackgroundMode;
  palette?: PaletteName;
  customMetrics?: Partial<Record<CardFormat, CardMetrics>>;
};

type CardMetrics = {
  widthMm: number;
  heightMm: number;
};

type BackgroundMode = "solid" | "transparent";
type PaletteName = "light" | "dark" | "blue" | "contrast";

type Palette = {
  cardBackground: string;
  text: string;
  muted: string;
  accent: string;
  border: string;
  qrBackground: string;
};

const fieldConfigs: Record<ContactType, FieldConfig> = {
  email: {
    inputType: "email",
    inputMode: "email",
  },
  phone: {
    inputType: "tel",
    inputMode: "tel",
  },
  whatsapp: {
    inputType: "tel",
    inputMode: "tel",
  },
  url: {
    inputType: "url",
    inputMode: "url",
  },
};

const titleInput = getElement<HTMLInputElement>("card-title");
const kickerInput = getElement<HTMLInputElement>("card-kicker");
const messageInput = getElement<HTMLTextAreaElement>("card-message");
const footerInput = getElement<HTMLInputElement>("card-footer");
const showQrContextInput = getElement<HTMLInputElement>("show-qr-context");
const languageSelect = getElement<HTMLSelectElement>("language-select");
const contactTypeSelect = getElement<HTMLSelectElement>("contact-type");
const contactInput = getElement<HTMLInputElement>("contact-value");
const contactLabel = getElement<HTMLElement>("contact-label");
const qrTargetPreview = getElement<HTMLOutputElement>("qr-target-preview");
const cardWidthInput = getElement<HTMLInputElement>("card-width");
const cardHeightInput = getElement<HTMLInputElement>("card-height");
const backgroundModeSelect = getElement<HTMLSelectElement>("background-mode");
const paletteSelect = getElement<HTMLSelectElement>("card-palette");
const copyCountInput = getElement<HTMLInputElement>("copy-count");
const showCutLinesInput = getElement<HTMLInputElement>("show-cut-lines");
const safeMarginInput = getElement<HTMLInputElement>("safe-margin");
const cardForm = getElement<HTMLFormElement>("card-form");
const printCardElement = getElement<HTMLElement>("print-card");
const printSheet = getElement<HTMLElement>("print-sheet");
const previewKicker = getElement<HTMLElement>("preview-kicker");
const previewTitle = getElement<HTMLElement>("preview-title");
const previewMessage = getElement<HTMLElement>("preview-message");
const previewFooter = getElement<HTMLElement>("preview-footer");
const previewQrContext = getElement<HTMLElement>("preview-qr-context");
const formatDescription = getElement<HTMLElement>("format-description");
const formatTabs = Array.from(
  document.querySelectorAll<HTMLButtonElement>(".format-tab"),
);
const viewTabs = Array.from(
  document.querySelectorAll<HTMLButtonElement>(".view-tab"),
);
const previewView = getElement<HTMLElement>("preview-view");
const howToView = getElement<HTMLElement>("how-to-view");
const howToSteps = getElement<HTMLOListElement>("how-to-steps");
const qrImage = getElement<HTMLImageElement>("qr-image");
const qrPlaceholder = getElement<HTMLElement>("qr-placeholder");
const formError = getElement<HTMLElement>("form-error");
const printButton = getElement<HTMLButtonElement>("print-button");
const downloadPngButton = getElement<HTMLButtonElement>("download-png-button");
const downloadSvgButton = getElement<HTMLButtonElement>("download-svg-button");
const resetSizeButton = getElement<HTMLButtonElement>("reset-size-button");
const resetButton = getElement<HTMLButtonElement>("reset-button");

const storageKey = "am-i-lost-state";
const pxPerMm = 96 / 25.4;
const formatMetrics: Record<CardFormat, CardMetrics> = {
  wallet: { widthMm: 85.6, heightMm: 54 },
  keychain: { widthMm: 45, heightMm: 32 },
  compact: { widthMm: 38, heightMm: 50 },
};
const palettes: Record<PaletteName, Palette> = {
  light: {
    cardBackground: "#ffffff",
    text: "#1f2937",
    muted: "#667085",
    accent: "#2563eb",
    border: "#98a2b3",
    qrBackground: "#ffffff",
  },
  dark: {
    cardBackground: "#111827",
    text: "#f9fafb",
    muted: "#d0d5dd",
    accent: "#93c5fd",
    border: "#f9fafb",
    qrBackground: "#ffffff",
  },
  blue: {
    cardBackground: "#eff6ff",
    text: "#172554",
    muted: "#1e3a8a",
    accent: "#2563eb",
    border: "#1e40af",
    qrBackground: "#ffffff",
  },
  contrast: {
    cardBackground: "#ffffff",
    text: "#000000",
    muted: "#111111",
    accent: "#000000",
    border: "#000000",
    qrBackground: "#ffffff",
  },
};
const customMetrics: Record<CardFormat, CardMetrics> = {
  wallet: { ...formatMetrics.wallet },
  keychain: { ...formatMetrics.keychain },
  compact: { ...formatMetrics.compact },
};

let qrUpdateSequence = 0;
let currentLanguage: Language = "en";
let selectedFormat: CardFormat = "wallet";
let selectedPalette: PaletteName = "light";
let selectedBackgroundMode: BackgroundMode = "solid";

function t(): (typeof translations)[Language] {
  return translations[currentLanguage];
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Nedostaje element #${id}`);
  }

  return element as T;
}

function getContactType(): ContactType {
  return contactTypeSelect.value as ContactType;
}

function isContactType(value: string): value is ContactType {
  return value === "email" || value === "phone" || value === "whatsapp" || value === "url";
}

function isCardFormat(value: string): value is CardFormat {
  return value === "wallet" || value === "keychain" || value === "compact";
}

function isLanguage(value: string): value is Language {
  return value in translations;
}

function isBackgroundMode(value: string): value is BackgroundMode {
  return value === "solid" || value === "transparent";
}

function isPaletteName(value: string): value is PaletteName {
  return value === "light" || value === "dark" || value === "blue" || value === "contrast";
}

function getCopyCount(): number {
  const parsed = Number.parseInt(copyCountInput.value, 10);

  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.min(24, Math.max(1, parsed));
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function formatMm(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getCurrentMetrics(): CardMetrics {
  return customMetrics[selectedFormat];
}

function setCurrentMetrics(metrics: CardMetrics): void {
  customMetrics[selectedFormat] = {
    widthMm: clampNumber(metrics.widthMm, 25, 120),
    heightMm: clampNumber(metrics.heightMm, 25, 120),
  };
  applyCardMetrics();
}

function applyCardMetrics(): void {
  const metrics = getCurrentMetrics();
  cardWidthInput.value = formatMm(metrics.widthMm);
  cardHeightInput.value = formatMm(metrics.heightMm);
  printCardElement.style.setProperty("--card-width", `${metrics.widthMm}mm`);
  printCardElement.style.setProperty("--card-height", `${metrics.heightMm}mm`);
  formatDescription.textContent = `${t().formatDescriptions[selectedFormat]} ${formatMm(metrics.widthMm)} x ${formatMm(metrics.heightMm)} mm.`;
}

function getCurrentPalette(): Palette {
  return palettes[selectedPalette];
}

function applyAppearance(): void {
  const palette = getCurrentPalette();
  const background =
    selectedBackgroundMode === "transparent" ? "transparent" : palette.cardBackground;

  printCardElement.style.setProperty("--card-bg", background);
  printCardElement.style.setProperty("--card-text", palette.text);
  printCardElement.style.setProperty("--card-muted", palette.muted);
  printCardElement.style.setProperty("--card-accent", palette.accent);
  printCardElement.style.setProperty("--card-border", palette.border);
  printCardElement.style.setProperty("--qr-bg", palette.qrBackground);
  backgroundModeSelect.value = selectedBackgroundMode;
  paletteSelect.value = selectedPalette;
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function normalizePhoneForDial(value: string): string {
  const trimmed = value.trim();
  const withoutSeparators = trimmed.replace(/[^\d+]/g, "");

  if (withoutSeparators.startsWith("00")) {
    return `+${withoutSeparators.slice(2)}`;
  }

  return withoutSeparators;
}

function normalizePhoneForWhatsapp(value: string): string {
  return normalizePhoneForDial(value).replace(/\D/g, "");
}

function createContactUrl(type: ContactType, value: string): string {
  const trimmed = value.trim();

  switch (type) {
    case "email": {
      const subject = encodeURIComponent(t().emailSubject);
      const body = encodeURIComponent(t().emailBody);
      return `mailto:${trimmed}?subject=${subject}&body=${body}`;
    }

    case "phone":
      return `tel:${normalizePhoneForDial(trimmed)}`;

    case "whatsapp": {
      const number = normalizePhoneForWhatsapp(trimmed);
      const text = encodeURIComponent(t().whatsappText);
      return `https://wa.me/${number}?text=${text}`;
    }

    case "url":
      return normalizeUrl(trimmed);
  }
}

function createContactLabel(type: ContactType, value: string): string {
  const trimmed = value.trim();

  switch (type) {
    case "email":
      return trimmed;

    case "phone":
      return normalizePhoneForDial(trimmed);

    case "whatsapp":
      return `WhatsApp ${normalizePhoneForDial(trimmed)}`;

    case "url":
      return normalizeUrl(trimmed);
  }
}

function validateContact(type: ContactType, value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return t().missingContact;
  }

  switch (type) {
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
        ? null
        : t().invalidEmail;

    case "phone":
    case "whatsapp": {
      const digitCount = trimmed.replace(/\D/g, "").length;
      return digitCount >= 7
        ? null
        : t().invalidPhone;
    }

    case "url": {
      try {
        const parsed = new URL(normalizeUrl(trimmed));
        return parsed.hostname.includes(".")
          ? null
          : t().invalidUrl;
      } catch {
        return t().invalidUrl;
      }
    }
  }
}

function getQrTarget(): string | null {
  const type = getContactType();
  const value = contactInput.value;

  if (validateContact(type, value)) {
    return null;
  }

  return createContactUrl(type, value);
}

function updateQrTargetPreview(): void {
  const target = getQrTarget();
  qrTargetPreview.textContent = target ?? t().qrTargetEmpty;
  qrTargetPreview.classList.toggle("is-empty", !target);
}

function updateTextPreview(): void {
  const contactError = validateContact(getContactType(), contactInput.value);
  const footerText = footerInput.value.trim() || t().fallbackFooter;

  previewKicker.textContent = kickerInput.value.trim() || t().defaultKicker;
  previewTitle.textContent = titleInput.value.trim() || t().defaultTitle;
  previewMessage.textContent =
    messageInput.value.trim() || t().fallbackMessage;
  previewFooter.textContent = footerText;
  previewQrContext.textContent = createContactLabel(
    getContactType(),
    contactInput.value,
  );
  previewQrContext.hidden =
    !showQrContextInput.checked || Boolean(contactError);
  updateQrTargetPreview();
}

function setCardFormat(format: CardFormat): void {
  selectedFormat = format;
  printCardElement.className = `lost-card format-${format}`;

  formatTabs.forEach((tab) => {
    const isActive = tab.dataset.format === format;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  applyCardMetrics();
  updateTextPreview();
}

function applyTranslations(): void {
  const copy = t();
  const metaDescription = document.querySelector<HTMLMetaElement>(
    'meta[name="description"]',
  );

  document.documentElement.lang = currentLanguage;
  document.title = copy.documentTitle;

  if (metaDescription) {
    metaDescription.content = copy.metaDescription;
  }

  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;

    if (key && key in copy) {
      const value = copy[key as keyof typeof copy];

      if (typeof value === "string") {
        element.textContent = value;
      }
    }
  });

  document
    .querySelectorAll<HTMLElement>("[data-i18n-aria-label]")
    .forEach((element) => {
      const key = element.dataset.i18nAriaLabel;

      if (key && key in copy) {
        const value = copy[key as keyof typeof copy];

        if (typeof value === "string") {
          element.setAttribute("aria-label", value);
        }
      }
    });

  Array.from(contactTypeSelect.options).forEach((option) => {
    const contactType = option.value as ContactType;
    option.textContent = copy.contactOptions[contactType];
  });

  Array.from(backgroundModeSelect.options).forEach((option) => {
    const mode = option.value;

    if (mode === "solid" || mode === "transparent") {
      option.textContent = copy.backgroundOptions[mode];
    }
  });

  Array.from(paletteSelect.options).forEach((option) => {
    const palette = option.value;

    if (palette === "light" || palette === "dark" || palette === "blue" || palette === "contrast") {
      option.textContent = copy.paletteOptions[palette];
    }
  });

  formatTabs.forEach((tab) => {
    const format = tab.dataset.format;

    if (format === "wallet" || format === "keychain" || format === "compact") {
      tab.textContent = copy.formatLabels[format];
    }
  });

  howToSteps.replaceChildren(
    ...copy.howToSteps.map((step) => {
      const item = document.createElement("li");
      item.textContent = step;
      return item;
    }),
  );

  qrImage.alt = copy.qrAlt;
  languageSelect.value = currentLanguage;
  setCardFormat(selectedFormat);
  applyAppearance();
  updateContactField(false);
}

function setPreviewView(view: "preview" | "how-to"): void {
  previewView.hidden = view !== "preview";
  howToView.hidden = view !== "how-to";

  viewTabs.forEach((tab) => {
    const isActive = tab.dataset.view === view;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
}

function setLanguage(language: Language): void {
  const previousCopy = t();
  currentLanguage = language;

  if (titleInput.value === previousCopy.defaultTitle) {
    titleInput.value = t().defaultTitle;
  }

  if (kickerInput.value === previousCopy.defaultKicker) {
    kickerInput.value = t().defaultKicker;
  }

  if (messageInput.value === previousCopy.defaultMessage) {
    messageInput.value = t().defaultMessage;
  }

  if (footerInput.value === previousCopy.defaultFooter) {
    footerInput.value = t().defaultFooter;
  }

  applyTranslations();
  saveState();
}

function getSelectedLanguage(): Language {
  return isLanguage(languageSelect.value) ? languageSelect.value : "en";
}

function saveState(): void {
  const state: StoredState = {
    language: currentLanguage,
    format: selectedFormat,
    title: titleInput.value,
    kicker: kickerInput.value,
    message: messageInput.value,
    footer: footerInput.value,
    showQrContext: showQrContextInput.checked,
    contactType: getContactType(),
    contactValue: contactInput.value,
    copyCount: getCopyCount(),
    showCutLines: showCutLinesInput.checked,
    safeMargin: safeMarginInput.checked,
    backgroundMode: selectedBackgroundMode,
    palette: selectedPalette,
    customMetrics,
  };

  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
  }
}

function loadState(): void {
  let state: StoredState;

  try {
    const raw = localStorage.getItem(storageKey);

    if (!raw) {
      return;
    }

    state = JSON.parse(raw) as StoredState;
  } catch {
    return;
  }

  if (state.language && isLanguage(state.language)) {
    currentLanguage = state.language;
  }

  if (state.format && isCardFormat(state.format)) {
    selectedFormat = state.format;
  }

  if (typeof state.title === "string") {
    titleInput.value = state.title;
  }

  if (typeof state.kicker === "string") {
    kickerInput.value = state.kicker;
  }

  if (typeof state.message === "string") {
    messageInput.value = state.message;
  }

  if (typeof state.footer === "string") {
    footerInput.value = state.footer;
  }

  if (typeof state.showQrContext === "boolean") {
    showQrContextInput.checked = state.showQrContext;
  }

  if (state.contactType && isContactType(state.contactType)) {
    contactTypeSelect.value = state.contactType;
  }

  if (typeof state.contactValue === "string") {
    contactInput.value = state.contactValue;
  }

  if (typeof state.copyCount === "number") {
    copyCountInput.value = String(Math.min(24, Math.max(1, state.copyCount)));
  }

  if (typeof state.showCutLines === "boolean") {
    showCutLinesInput.checked = state.showCutLines;
  }

  if (typeof state.safeMargin === "boolean") {
    safeMarginInput.checked = state.safeMargin;
  }

  if (state.backgroundMode && isBackgroundMode(state.backgroundMode)) {
    selectedBackgroundMode = state.backgroundMode;
  }

  if (state.palette && isPaletteName(state.palette)) {
    selectedPalette = state.palette;
  }

  if (state.customMetrics) {
    Object.entries(state.customMetrics).forEach(([format, metrics]) => {
      if (
        isCardFormat(format) &&
        metrics &&
        typeof metrics.widthMm === "number" &&
        typeof metrics.heightMm === "number"
      ) {
        customMetrics[format] = {
          widthMm: clampNumber(metrics.widthMm, 25, 120),
          heightMm: clampNumber(metrics.heightMm, 25, 120),
        };
      }
    });
  }
}

function updateSelectedSizeFromInputs(): void {
  const widthMm = clampNumber(Number.parseFloat(cardWidthInput.value), 25, 120);
  const heightMm = clampNumber(Number.parseFloat(cardHeightInput.value), 25, 120);
  setCurrentMetrics({ widthMm, heightMm });
  saveState();
}

function resetSelectedSize(): void {
  customMetrics[selectedFormat] = { ...formatMetrics[selectedFormat] };
  applyCardMetrics();
  saveState();
}

function updateContactField(clearValue = true): void {
  const config = fieldConfigs[getContactType()];
  contactLabel.textContent = t().contactLabels[getContactType()];
  contactInput.placeholder = t().contactPlaceholders[getContactType()];
  contactInput.type = config.inputType;
  contactInput.inputMode = config.inputMode;
  if (clearValue) {
    contactInput.value = "";
  }
  updateTextPreview();
  void updateQrCode();
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapText(value: string, maxChars: number, maxLines: number): string[] {
  const trimmed = value.trim();

  if (!trimmed) {
    return [];
  }

  const words = trimmed.includes(" ") ? trimmed.split(/\s+/) : Array.from(trimmed);
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const separator = trimmed.includes(" ") ? " " : "";
    const nextLine = currentLine ? `${currentLine}${separator}${word}` : word;

    if (nextLine.length > maxChars && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      return;
    }

    currentLine = nextLine;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  if (lines.length <= maxLines) {
    return lines;
  }

  const clipped = lines.slice(0, maxLines);
  clipped[maxLines - 1] = `${clipped[maxLines - 1].replace(/\.*$/, "")}...`;
  return clipped;
}

function svgText(
  lines: string[],
  x: number,
  y: number,
  options: {
    size: number;
    weight?: number;
    color?: string;
    anchor?: "start" | "middle";
    lineHeight?: number;
    letterSpacing?: number;
  },
): string {
  const lineHeight = options.lineHeight ?? options.size * 1.25;
  const tspans = lines
    .map((line, index) => {
      const dy = index === 0 ? 0 : lineHeight;
      return `<tspan x="${x}" dy="${dy}">${escapeXml(line)}</tspan>`;
    })
    .join("");

  return `<text x="${x}" y="${y}" fill="${options.color ?? "#111827"}" font-size="${options.size}" font-weight="${options.weight ?? 700}" text-anchor="${options.anchor ?? "start"}" letter-spacing="${options.letterSpacing ?? 0}">${tspans}</text>`;
}

function getDownloadName(extension: "svg" | "png"): string {
  const base = (titleInput.value.trim() || "am-i-lost")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${base || "am-i-lost"}-${selectedFormat}.${extension}`;
}

async function getQrDataUrlForExport(): Promise<string | null> {
  const target = getQrTarget();

  if (!target) {
    formError.textContent = t().downloadNeedsQr;
    contactInput.focus();
    return null;
  }

  if (qrImage.src) {
    return qrImage.src;
  }

  return QRCode.toDataURL(target, {
    width: 900,
    margin: 1,
    errorCorrectionLevel: "H",
    color: {
      dark: "#111827",
      light: "#ffffff",
    },
  });
}

function buildCardSvg(qrDataUrl: string): string {
  const metrics = getCurrentMetrics();
  const palette = getCurrentPalette();
  const cardFill =
    selectedBackgroundMode === "transparent" ? "none" : palette.cardBackground;
  const baseMetrics = formatMetrics[selectedFormat];
  const width = metrics.widthMm;
  const height = metrics.heightMm;
  const scaleX = width / baseMetrics.widthMm;
  const scaleY = height / baseMetrics.heightMm;
  const contentScale = Math.min(scaleX, scaleY);
  const offsetX = (width - baseMetrics.widthMm * contentScale) / 2;
  const offsetY = (height - baseMetrics.heightMm * contentScale) / 2;
  const layoutWidth = baseMetrics.widthMm;
  const layoutHeight = baseMetrics.heightMm;
  const title = titleInput.value.trim() || t().defaultTitle;
  const kicker = kickerInput.value.trim() || t().defaultKicker;
  const message = messageInput.value.trim() || t().fallbackMessage;
  const contactLabel = createContactLabel(getContactType(), contactInput.value);
  const contactError = validateContact(getContactType(), contactInput.value);
  const footer = footerInput.value.trim() || t().fallbackFooter;
  const showContact = showQrContextInput.checked && !contactError;
  const radius = selectedFormat === "keychain" ? 8 : 3.2;
  let content = "";

  if (selectedFormat === "wallet") {
    content += svgText([kicker], 5, 9, {
      size: 2.3,
      weight: 800,
      color: palette.accent,
      letterSpacing: 0.35,
    });
    content += svgText(wrapText(title, 11, 2), 5, 17, {
      size: 7,
      weight: 900,
      color: palette.text,
      lineHeight: 6.8,
      letterSpacing: -0.25,
    });
    content += svgText(wrapText(message, 28, 3), 5, 30, {
      size: 3.1,
      weight: 500,
      color: palette.text,
      lineHeight: 4,
    });
    content += svgText(wrapText(footer, 32, 2), 5, 45, {
      size: 2.35,
      weight: 800,
      color: palette.muted,
      lineHeight: 3,
    });
    content += `<rect x="51.6" y="10.5" width="29" height="29" rx="1.6" fill="${palette.qrBackground}" stroke="${palette.border}" stroke-width="0.35"/>`;
    content += `<image href="${qrDataUrl}" x="52.35" y="11.25" width="27.5" height="27.5"/>`;
    content += svgText([t().scanMe], 66.1, 44, {
      size: 2.15,
      weight: 900,
      color: palette.text,
      anchor: "middle",
      letterSpacing: 0.35,
    });

    if (showContact) {
      content += svgText(wrapText(contactLabel, 22, 2), 66.1, 49, {
        size: 2.15,
        weight: 750,
        color: palette.muted,
        anchor: "middle",
        lineHeight: 2.6,
      });
    }
  }

  if (selectedFormat === "keychain") {
    content += svgText(wrapText(title, 9, 2), 3, 9, {
      size: 4.2,
      weight: 900,
      color: palette.text,
      lineHeight: 4.3,
      letterSpacing: -0.1,
    });
    content += svgText(wrapText(message, 18, 3), 3, 18, {
      size: 2.05,
      weight: 500,
      color: palette.text,
      lineHeight: 2.4,
    });
    content += `<rect x="25" y="6.2" width="17" height="17" rx="1.2" fill="${palette.qrBackground}" stroke="${palette.border}" stroke-width="0.35"/>`;
    content += `<image href="${qrDataUrl}" x="25.5" y="6.7" width="16" height="16"/>`;

    if (showContact) {
      content += svgText(wrapText(contactLabel, 14, 2), 33.5, 26.6, {
        size: 1.65,
        weight: 750,
        color: palette.muted,
        anchor: "middle",
        lineHeight: 1.9,
      });
    }
  }

  if (selectedFormat === "compact") {
    content += svgText(wrapText(title, 14, 2), layoutWidth / 2, 8, {
      size: 4.7,
      weight: 900,
      color: palette.text,
      anchor: "middle",
      lineHeight: 5,
      letterSpacing: -0.1,
    });
    content += `<rect x="4.5" y="14" width="29" height="29" rx="1.6" fill="${palette.qrBackground}" stroke="${palette.border}" stroke-width="0.35"/>`;
    content += `<image href="${qrDataUrl}" x="5.25" y="14.75" width="27.5" height="27.5"/>`;

    if (showContact) {
      content += svgText(wrapText(contactLabel, 18, 2), layoutWidth / 2, 47, {
        size: 2.15,
        weight: 750,
        color: palette.muted,
        anchor: "middle",
        lineHeight: 2.5,
      });
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}">
  <rect x="0.225" y="0.225" width="${width - 0.45}" height="${height - 0.45}" rx="${radius}" fill="${cardFill}" stroke="${palette.border}" stroke-width="0.45"/>
  <g transform="translate(${offsetX} ${offsetY}) scale(${contentScale})" font-family="Inter, Arial, sans-serif">
    <rect x="0" y="0" width="${layoutWidth}" height="${layoutHeight}" fill="transparent"/>
    ${content}
  </g>
</svg>`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function downloadSvg(): Promise<void> {
  const qrDataUrl = await getQrDataUrlForExport();

  if (!qrDataUrl) {
    return;
  }

  downloadBlob(
    new Blob([buildCardSvg(qrDataUrl)], { type: "image/svg+xml;charset=utf-8" }),
    getDownloadName("svg"),
  );
}

async function downloadPng(): Promise<void> {
  const qrDataUrl = await getQrDataUrlForExport();

  if (!qrDataUrl) {
    return;
  }

  const svg = buildCardSvg(qrDataUrl);
  const metrics = getCurrentMetrics();
  const image = new Image();
  const svgUrl = URL.createObjectURL(
    new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
  );

  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(metrics.widthMm * pxPerMm * 3);
    canvas.height = Math.round(metrics.heightMm * pxPerMm * 3);
    const context = canvas.getContext("2d");

    if (!context) {
      URL.revokeObjectURL(svgUrl);
      return;
    }

    if (selectedBackgroundMode !== "transparent") {
      context.fillStyle = getCurrentPalette().cardBackground;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(svgUrl);
    canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, getDownloadName("png"));
      }
    }, "image/png");
  };

  image.src = svgUrl;
}

function syncPrintSheet(): void {
  const count = getCopyCount();
  printSheet.innerHTML = "";
  printSheet.classList.toggle("with-cut-lines", showCutLinesInput.checked);
  printSheet.classList.toggle("with-safe-margin", safeMarginInput.checked);

  for (let index = 0; index < count; index += 1) {
    const slot = document.createElement("div");
    const clone = printCardElement.cloneNode(true) as HTMLElement;
    slot.className = "print-slot";
    clone.removeAttribute("id");
    clone.querySelectorAll("[id]").forEach((element) => {
      element.removeAttribute("id");
    });
    slot.append(clone);
    printSheet.append(slot);
  }
}

async function updateQrCode(): Promise<void> {
  const currentSequence = ++qrUpdateSequence;
  const type = getContactType();
  const value = contactInput.value;
  const error = validateContact(type, value);

  if (error) {
    formError.textContent = value.trim() ? error : "";
    qrImage.removeAttribute("src");
    qrImage.hidden = true;
    qrPlaceholder.hidden = false;
    qrPlaceholder.textContent = value.trim() ? t().checkContact : t().enterContact;
    return;
  }

  formError.textContent = "";

  try {
    const qrDataUrl = await QRCode.toDataURL(createContactUrl(type, value), {
      width: 900,
      margin: 1,
      errorCorrectionLevel: "H",
      color: {
        dark: "#111827",
        light: "#ffffff",
      },
    });

    if (currentSequence !== qrUpdateSequence) {
      return;
    }

    qrImage.src = qrDataUrl;
    qrImage.hidden = false;
    qrPlaceholder.hidden = true;
  } catch (error) {
    console.error(error);
    formError.textContent = t().qrError;
    qrImage.hidden = true;
    qrPlaceholder.hidden = false;
    qrPlaceholder.textContent = t().errorLabel;
  }
}

function resetForm(): void {
  titleInput.value = t().defaultTitle;
  kickerInput.value = t().defaultKicker;
  messageInput.value = t().defaultMessage;
  footerInput.value = t().defaultFooter;
  showQrContextInput.checked = false;
  copyCountInput.value = "1";
  showCutLinesInput.checked = false;
  safeMarginInput.checked = true;
  selectedBackgroundMode = "solid";
  selectedPalette = "light";
  customMetrics.wallet = { ...formatMetrics.wallet };
  customMetrics.keychain = { ...formatMetrics.keychain };
  customMetrics.compact = { ...formatMetrics.compact };
  contactTypeSelect.value = "email";
  setCardFormat("wallet");
  applyAppearance();
  updateTextPreview();
  updateContactField();
  saveState();
  contactInput.focus();
}

async function printCard(): Promise<void> {
  const error = validateContact(getContactType(), contactInput.value);

  if (error) {
    formError.textContent = error;
    contactInput.focus();
    return;
  }

  await updateQrCode();
  syncPrintSheet();
  window.print();
}

[titleInput, kickerInput, messageInput, footerInput].forEach((element) => {
  element.addEventListener("input", () => {
    updateTextPreview();
    saveState();
  });
});

showQrContextInput.addEventListener("change", () => {
  updateTextPreview();
  saveState();
});
copyCountInput.addEventListener("input", () => {
  copyCountInput.value = String(getCopyCount());
  saveState();
});
cardWidthInput.addEventListener("change", updateSelectedSizeFromInputs);
cardHeightInput.addEventListener("change", updateSelectedSizeFromInputs);
cardWidthInput.addEventListener("input", updateSelectedSizeFromInputs);
cardHeightInput.addEventListener("input", updateSelectedSizeFromInputs);
showCutLinesInput.addEventListener("change", saveState);
safeMarginInput.addEventListener("change", saveState);
backgroundModeSelect.addEventListener("change", () => {
  selectedBackgroundMode = isBackgroundMode(backgroundModeSelect.value)
    ? backgroundModeSelect.value
    : "solid";
  applyAppearance();
  saveState();
});
paletteSelect.addEventListener("change", () => {
  selectedPalette = isPaletteName(paletteSelect.value) ? paletteSelect.value : "light";
  applyAppearance();
  saveState();
});
languageSelect.addEventListener("change", () => {
  setLanguage(getSelectedLanguage());
});
formatTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const format = tab.dataset.format;

    if (format === "wallet" || format === "keychain" || format === "compact") {
      setCardFormat(format);
      saveState();
    }
  });
});
viewTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setPreviewView(tab.dataset.view === "how-to" ? "how-to" : "preview");
  });
});
cardForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void printCard();
});
contactTypeSelect.addEventListener("change", () => {
  updateContactField();
  saveState();
});
contactInput.addEventListener("input", () => {
  updateTextPreview();
  void updateQrCode();
  saveState();
});
printButton.addEventListener("click", () => {
  void printCard();
});
downloadPngButton.addEventListener("click", () => {
  void downloadPng();
});
downloadSvgButton.addEventListener("click", () => {
  void downloadSvg();
});
resetSizeButton.addEventListener("click", resetSelectedSize);
resetButton.addEventListener("click", resetForm);
window.addEventListener("beforeprint", syncPrintSheet);

loadState();
applyTranslations();
