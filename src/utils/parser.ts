export interface ComprobanteData {
  ruc: string;
  fechaEmision: string;
  montoTotal: number;
  tipoDocumento: string;
  numeroDocumento: string;
  razonSocial: string;
}

export class ComprobanteParser {
  static extraerDatosDesdeTexto(texto: string): ComprobanteData {
    // Expresiones regulares para extraer la información
    const rucRegex = /R[UO]C[:\s]*(\d{11})/i;
    const fechaRegex = /FECHA[:\s]*(\d{2}\/\d{2}\/\d{4})/i;
    const montoRegex = /TOTAL[:\s]*S\/\.\s*(\d+\.?\d*)/i;
    const tipoDocRegex = /(BOLETA|FACTURA)/i;
    const numDocRegex = /N[°º]\s*(\d+-\d+)/i;
    const razonSocialRegex = /RAZON SOCIAL[:\s]*([^\n]+)/i;

    const ruc = this.extraerConRegex(texto, rucRegex);
    const fecha = this.extraerConRegex(texto, fechaRegex);
    const monto = this.extraerConRegex(texto, montoRegex);
    const tipoDocumento = this.extraerConRegex(texto, tipoDocRegex);
    const numeroDocumento = this.extraerConRegex(texto, numDocRegex);
    const razonSocial = this.extraerConRegex(texto, razonSocialRegex);

    return {
      ruc: ruc || '',
      fechaEmision: fecha || '',
      montoTotal: monto ? parseFloat(monto) : 0,
      tipoDocumento: tipoDocumento || '',
      numeroDocumento: numeroDocumento || '',
      razonSocial: razonSocial || '',
    };
  }

  private static extraerConRegex(texto: string, regex: RegExp): string | null {
    const match = texto.match(regex);
    return match ? match[1].trim() : null;
  }
} 