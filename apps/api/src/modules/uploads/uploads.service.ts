import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary } from "cloudinary";

const ALLOWED_MIME: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
};
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * File storage: Cloudinary (cocok dengan deploy Vercel — URL CDN publik,
 * tanpa server disk). R2 tetap opsi bila butuh S3-compatible privat penuh.
 * DB hanya menyimpan object_key (public_id), bukan URL mutable.
 */
@Injectable()
export class UploadsService {
  private ready = false;

  constructor(private readonly config: ConfigService) {
    const cloud = this.config.get<string>("CLOUDINARY_CLOUD_NAME", "");
    const key = this.config.get<string>("CLOUDINARY_API_KEY", "");
    const secret = this.config.get<string>("CLOUDINARY_API_SECRET", "");
    if (cloud && key && secret) {
      cloudinary.config({ cloud_name: cloud, api_key: key, api_secret: secret, secure: true });
      this.ready = true;
    }
  }

  async upload(file: Express.Multer.File, folder = "tripora"): Promise<{ object_key: string; url: string; bytes: number }> {
    if (!this.ready) {
      throw new ServiceUnavailableException({ code: "UPLOAD_NOT_CONFIGURED", message: "Storage belum dikonfigurasi (CLOUDINARY_*)." });
    }
    if (!file?.buffer?.length) throw new BadRequestException({ code: "VALIDATION_ERROR", message: "File kosong." });
    if (file.size > MAX_BYTES) throw new BadRequestException({ code: "VALIDATION_ERROR", message: "Maksimal 5MB." });
    const exts = ALLOWED_MIME[file.mimetype];
    const lower = (file.originalname ?? "").toLowerCase();
    if (!exts || !exts.some((e) => lower.endsWith(e))) {
      throw new BadRequestException({ code: "VALIDATION_ERROR", message: "Tipe file harus JPG/PNG/WebP/PDF." });
    }
    const result = await new Promise<{ public_id: string; secure_url: string; bytes: number }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder, resource_type: "auto" }, (err, res) =>
        err || !res ? reject(err ?? new Error("Upload failed")) : resolve(res as never)
      );
      stream.end(file.buffer);
    });
    return { object_key: result.public_id, url: result.secure_url, bytes: result.bytes };
  }
}
