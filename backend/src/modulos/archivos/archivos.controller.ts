import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { PortadorGuard } from '../../common/seguridad';
import { configuracion } from '../../config/configuracion';

/**
 * Fotos de recetas (JPG o PNG, hasta 10 MB).
 * Nota para la nube: en el plan gratis de Render el disco se borra al reiniciar. Para que las fotos
 * subidas sean permanentes usa un disco persistente (UPLOADS_DIR) o pega el enlace de una foto con licencia libre.
 */
@Controller('api/uploads')
export class ArchivosController {
  @Post() @UseGuards(PortadorGuard)
  @UseInterceptors(FileInterceptor('foto', {
    storage: diskStorage({
      destination: configuracion().carpetaSubidas,
      filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${extname(file.originalname).toLowerCase()}`),
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png)$/.test(file.mimetype)),
  }))
  subir(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Sube una imagen JPG o PNG de hasta 10 MB.');
    return { url: `/uploads/${file.filename}` };
  }
}
