import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { createWorker } from 'tesseract.js';
import * as pdfParse from 'pdf-parse';
import * as fs from 'fs';
import * as path from 'path';
import { Express } from 'express';

@Injectable()
export class DocumentsService {
  private readonly uploadDir = path.join(__dirname, '../../uploads');

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async processDocument(file: Express.Multer.File): Promise<any> {
    try {
      const filePath = file.path;
      let result;

      if (file.mimetype === 'application/pdf') {
        result = await this.processPDF(filePath);
      } else if (file.mimetype.startsWith('image/')) {
        result = await this.processImage(filePath);
      } else {
        throw new HttpException(
          'Tipo de archivo no soportado',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Extraer información estructurada
      const extractedData = this.extractDocumentInfo(result.text);

      return {
        originalFile: {
          name: file.originalname,
          type: file.mimetype,
          size: file.size,
        },
        extractedData,
        rawText: result.text,
        confidence: result.confidence,
      };
    } catch (error) {
      console.error('Error en processDocument:', error);
      throw new HttpException(
        `Error al procesar el documento: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async processPDF(filePath: string): Promise<any> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      
      return {
        text: data.text,
        confidence: 100,
        pages: data.numpages,
        info: data.info,
      };
    } catch (error) {
      throw new Error(`Error al procesar PDF: ${error.message}`);
    }
  }

  private async processImage(filePath: string): Promise<any> {
    const worker = await createWorker('spa');
    try {
      const { data } = await worker.recognize(filePath);
      return {
        text: data.text,
        confidence: data.confidence,
      };
    } catch (error) {
      throw new Error(`Error al procesar imagen: ${error.message}`);
    } finally {
      await worker.terminate();
    }
  }

  private extractDocumentInfo(text: string): any {
    // Normalizar el texto: eliminar espacios múltiples y caracteres especiales
    const normalizedText = text
      .replace(/\r\n/g, '\n')
      .replace(/\s+/g, ' ')
      .trim();

    // Patrones mejorados para extraer información básica
    const rucPattern = /R\.?U\.?C\.?\s*:?\s*(\d{11})/i;
    const numeroBoletaPattern = /(?:BOLETA|FACTURA|B\/V|F\/V|TICKET)\s*(?:ELECTR[OÓ]NICA)?\s*(?:DE\s*VENTA)?\s*(?:N[°º])?\.?\s*:?\s*([A-Z0-9\-]+)/i;
    const fechaPattern = /(?:FECHA|DATE|EMISI[OÓ]N)\s*:?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i;
    const clientePattern = /(?:SE[ÑN]OR(?:\(ES\))?|CLIENTE|CUSTOMER)\s*:?\s*([^:\n]+?)(?=\s*(?:DNI|RUC|DIRECCI[OÓ]N|$))/i;
    const direccionPattern = /(?:DIRECCI[OÓ]N|ADDRESS)\s*:?\s*([^:\n]+?)(?=\s*(?:DNI|RUC|FECHA|$))/i;
    const documentoIdentidadPattern = /(?:DNI|RUC|CE)\s*:?\s*(\d{8,11})/i;

    // Extraer items/productos con un patrón más flexible
    const items: any[] = [];
    
    // Buscar la sección de items
    const itemsSection = text.split(/(?:ITEMS?|PRODUCTOS?|DESCRIPCI[OÓ]N)/i)[1]?.split(/(?:SUBTOTAL|TOTAL|IGV)/i)[0] || text;
    
    // Diferentes patrones para detectar items
    const itemPatterns = [
      // Patrón 1: Cantidad - Descripción - Precio
      /(\d+)\s+([^0-9\n]+?)\s+(\d+(?:\.\d{2})?)\s*$/gm,
      // Patrón 2: Descripción - Cantidad - Precio
      /([^0-9\n]+?)\s+(\d+)\s+(\d+(?:\.\d{2})?)\s*$/gm,
      // Patrón 3: Cantidad x Precio Unitario
      /(\d+)\s*[xX]\s*(\d+(?:\.\d{2})?)\s+([^0-9\n]+?)\s+(\d+(?:\.\d{2})?)\s*$/gm
    ];

    for (const pattern of itemPatterns) {
      let match;
      while ((match = pattern.exec(itemsSection)) !== null) {
        if (pattern === itemPatterns[2]) { // Patrón 3
          items.push({
            descripcion: match[3].trim(),
            cantidad: parseInt(match[1]),
            precio_unitario: parseFloat(match[2]),
            importe: parseFloat(match[4])
          });
        } else {
          const cantidad = parseInt(pattern === itemPatterns[0] ? match[1] : match[2]);
          const descripcion = pattern === itemPatterns[0] ? match[2] : match[1];
          const importe = parseFloat(match[3]);
          
          items.push({
            descripcion: descripcion.trim(),
            cantidad: cantidad,
            precio_unitario: importe / cantidad,
            importe: importe
          });
        }
      }
    }

    // Extraer totales con patrones más flexibles
    const totalPattern = /TOTAL\s*:?\s*S\/?\.\s*(\d+(?:\.\d{2})?)/i;
    const subtotalPattern = /SUB\s*TOTAL\s*:?\s*S\/?\.\s*(\d+(?:\.\d{2})?)/i;
    const igvPattern = /I\.?G\.?V\.?\s*(?:\(?\s*18%\s*\)?)?\s*:?\s*S\/?\.\s*(\d+(?:\.\d{2})?)/i;

    const totalMatch = normalizedText.match(totalPattern);
    const subtotalMatch = normalizedText.match(subtotalPattern);
    const igvMatch = normalizedText.match(igvPattern);

    // Extraer tipo y número de documento del cliente
    const tipoDocMatch = normalizedText.match(/(?:TIPO\s+DOC\.?|DOCUMENTO)\s*:?\s*(DNI|RUC|CE)/i);
    const numDocMatch = normalizedText.match(/(?:N[°º]\s*DOC\.?|DOCUMENTO)\s*:?\s*(\d{8,11})/i);
    
    const documentoCliente = {
      tipo: tipoDocMatch ? tipoDocMatch[1].toUpperCase() : 
            normalizedText.match(/DNI|RUC|CE/i)?.[0].toUpperCase() || null,
      numero: (numDocMatch?.[1] || normalizedText.match(/(?:DNI|RUC|CE)\s*:?\s*(\d{8,11})/i)?.[1]) || null
    };

    // Determinar tipo de documento
    let tipoDocumento = "BOLETA DE VENTA";
    if (normalizedText.match(/FACTURA/i)) {
      tipoDocumento = "FACTURA";
    } else if (normalizedText.match(/TICKET/i)) {
      tipoDocumento = "TICKET";
    }

    // Construir objeto de respuesta
    const documentInfo = {
      tipo_documento: tipoDocumento,
      numero: text.match(numeroBoletaPattern)?.[1]?.replace(/\s+/g, '') || null,
      fecha_emision: text.match(fechaPattern)?.[1] || null,
      emisor: {
        ruc: text.match(rucPattern)?.[1] || null,
        razon_social: "MICKY LIBRERIA-BAZAR"
      },
      cliente: {
        nombre: text.match(clientePattern)?.[1]?.trim() || null,
        documento: documentoCliente.numero ? documentoCliente : null
      },
      items: items,
      totales: {
        subtotal: subtotalMatch ? parseFloat(subtotalMatch[1]) : null,
        igv: igvMatch ? parseFloat(igvMatch[1]) : null,
        total: totalMatch ? parseFloat(totalMatch[1]) : null
      }
    };

    // Si no se encontró subtotal pero hay total e IGV, calcularlo
    if (!documentInfo.totales.subtotal && documentInfo.totales.total && documentInfo.totales.igv) {
      documentInfo.totales.subtotal = documentInfo.totales.total - documentInfo.totales.igv;
    }

    // Si no se encontró IGV pero hay total y subtotal, calcularlo
    if (!documentInfo.totales.igv && documentInfo.totales.total && documentInfo.totales.subtotal) {
      documentInfo.totales.igv = documentInfo.totales.total - documentInfo.totales.subtotal;
    }

    // Calcular total si no se encontró pero tenemos items
    if (!documentInfo.totales.total && items.length > 0) {
      documentInfo.totales.total = items.reduce((sum, item) => sum + (item.importe || 0), 0);
    }

    return documentInfo;
  }
}
