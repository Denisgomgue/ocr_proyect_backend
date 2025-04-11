import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { ComprobanteController } from './controllers/comprobante.controller';
import { GoogleVisionService } from './services/google-vision.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MulterModule.register({
      dest: './uploads',
    }),
  ],
  controllers: [ComprobanteController],
  providers: [GoogleVisionService],
})
export class AppModule {}
