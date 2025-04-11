import { IsString, IsNumber, IsNotEmpty, IsOptional, Matches, IsDateString } from 'class-validator';

export class ComprobanteResponseDto {
    @IsString()
    @IsNotEmpty()
    @Matches(/^\d{11}$/, { message: 'El RUC debe tener 11 dígitos' })
    ruc: string;

    @IsDateString()
    @IsNotEmpty()
    fechaEmision: string;

    @IsNumber()
    @IsNotEmpty()
    montoTotal: number;

    @IsString()
    @IsNotEmpty()
    @Matches(/^(BOLETA|FACTURA)$/i, { message: 'Tipo de documento inválido' })
    tipoDocumento: string;

    @IsString()
    @IsNotEmpty()
    @Matches(/^\d+-\d+$/, { message: 'Formato de número de documento inválido' })
    numeroDocumento: string;

    @IsString()
    @IsNotEmpty()
    razonSocial: string;

    @IsOptional()
    @IsString()
    textoOriginal?: string;
} 