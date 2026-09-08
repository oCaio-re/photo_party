import QRCode from "qrcode";

export async function generateQrCodeDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 400,
    margin: 2,
    color: {
      dark: "#5a6248", // Sage Olive color matching wedding theme
      light: "#ffffff",
    },
    errorCorrectionLevel: "H",
  });
}
