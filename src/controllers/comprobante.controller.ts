import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException, Logger } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GoogleVisionService } from '../services/google-vision.service';
import { ComprobanteParser, ComprobanteData } from '../utils/parser';
import { memoryStorage } from 'multer';

@Controller('comprobantes')
export class ComprobanteController {
  private readonly logger = new Logger(ComprobanteController.name);

  constructor(private readonly googleVisionService: GoogleVisionService) {}

  @Post('procesar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        // Aceptar cualquier tipo de imagen
        if (!file.mimetype.match(/(jpg|jpeg|png|gif|bmp|webp)$/i)) {
          return cb(new BadRequestException('Formato de archivo no soportado'), false);
        }
        cb(null, true);
      },
    }),
  )
  async procesarComprobante(@UploadedFile() file: Express.Multer.File): Promise<ComprobanteData> {
    try {
      this.logger.debug('Información del archivo recibido:', {
        nombre: file?.originalname,
        mimetype: file?.mimetype,
        tamaño: file?.size,
        buffer: file?.buffer ? 'Buffer presente' : 'Buffer ausente'
      });

      if (!file) {
        this.logger.error('No se recibió ningún archivo');
        throw new BadRequestException('No se proporcionó ninguna imagen');
      }

      if (!file.buffer) {
        this.logger.error('El archivo no tiene contenido');
        throw new BadRequestException('El archivo está vacío');
      }

      // Procesar la imagen con Google Vision
      this.logger.log('Iniciando procesamiento con Google Vision');
      const textoExtraido = await this.googleVisionService.detectTextFromImage(file.buffer);
      this.logger.log('Texto extraído:', textoExtraido);

      // Extraer datos estructurados del texto
      this.logger.log('Analizando texto para extraer datos estructurados');
      const datosComprobante = ComprobanteParser.extraerDatosDesdeTexto(textoExtraido);
      this.logger.log('Datos extraídos:', datosComprobante);

      return datosComprobante;
    } catch (error) {
      this.logger.error('Error completo:', error);
      this.logger.error(`Error al procesar el comprobante: ${error.message}`);
      throw new BadRequestException(`Error al procesar el comprobante: ${error.message}`);
    }
  }
} 