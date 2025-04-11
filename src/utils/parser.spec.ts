import { ComprobanteParser } from './parser';

describe('ComprobanteParser', () => {
  describe('extraerDatosDesdeTexto', () => {
    it('debería extraer correctamente los datos de una boleta', () => {
      const texto = `
        BOLETA DE VENTA ELECTRÓNICA
        RUC: 20486760576
        FECHA: 26/07/2023
        TOTAL S/. 800.00
        N° B001-123456
        RAZON SOCIAL: EMPRESA EJEMPLO SAC
      `;

      const resultado = ComprobanteParser.extraerDatosDesdeTexto(texto);

      expect(resultado).toEqual({
        ruc: '20486760576',
        fechaEmision: '26/07/2023',
        montoTotal: 800.00,
        tipoDocumento: 'BOLETA',
        numeroDocumento: 'B001-123456',
        razonSocial: 'EMPRESA EJEMPLO SAC'
      });
    });

    it('debería manejar datos faltantes', () => {
      const texto = `
        BOLETA DE VENTA
        RUC: 20486760576
        TOTAL S/. 100.50
      `;

      const resultado = ComprobanteParser.extraerDatosDesdeTexto(texto);

      expect(resultado.ruc).toBe('20486760576');
      expect(resultado.montoTotal).toBe(100.50);
      expect(resultado.fechaEmision).toBe('');
      expect(resultado.razonSocial).toBe('');
    });

    it('debería manejar diferentes formatos de montos', () => {
      const texto = `
        FACTURA ELECTRÓNICA
        RUC: 20123456789
        TOTAL: S/. 1,234.56
      `;

      const resultado = ComprobanteParser.extraerDatosDesdeTexto(texto);
      expect(resultado.montoTotal).toBe(1234.56);
    });
  });
}); 