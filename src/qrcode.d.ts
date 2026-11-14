declare module 'qrcode' {
  export interface QRCodeOpcije {
    width?: number
    margin?: number
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
    color?: { dark?: string; light?: string }
  }

  export function toCanvas(
    canvas: HTMLCanvasElement,
    text: string,
    options?: QRCodeOpcije,
  ): Promise<void>

  const qrcode: {
    toCanvas: typeof toCanvas
  }

  export default qrcode
}
