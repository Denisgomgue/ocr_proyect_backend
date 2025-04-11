import { Injectable, Logger } from '@nestjs/common';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleVisionService {
    private client: ImageAnnotatorClient;
    private readonly logger = new Logger(GoogleVisionService.name);

    constructor(private configService: ConfigService) {
        try {
            const credentialsPath = this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS');
            
            if (!credentialsPath) {
                throw new Error('Variable GOOGLE_APPLICATION_CREDENTIALS no configurada');
            }

            this.client = new ImageAnnotatorClient({
                keyFilename: credentialsPath,
            });
            
            this.logger.log('Cliente de Google Cloud Vision inicializado correctamente');
        } catch (error) {
            this.logger.error('Error al inicializar el cliente de Google Cloud Vision:', error);
            throw error;
        }
    }

    async detectTextFromImage(imageBuffer: Buffer): Promise<string> {
        try {
            this.logger.log('Iniciando detección de texto en la imagen...');
            
            const [result] = await this.client.textDetection({
                image: { content: imageBuffer },
            });

            const detections = result.textAnnotations;
            if (!detections || detections.length === 0) {
                throw new Error('No se detectó texto en la imagen');
            }

            // Verificar que el primer elemento y su descripción existan
            const firstDetection = detections[0];
            if (!firstDetection || !firstDetection.description) {
                throw new Error('No se pudo extraer texto de la imagen');
            }

            this.logger.log('Texto detectado exitosamente');
            return firstDetection.description;
        } catch (error) {
            this.logger.error('Error en la detección de texto:', error);
            throw new Error(`Error al procesar la imagen: ${error.message}`);
        }
    }
} 