import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class StorageService {
  private uploadDir = join(__dirname, '..', '..', 'uploads');

  constructor() {
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(file: any): Promise<string> {
    const ext = file.originalname.split('.').pop() || 'bin';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
    const filePath = join(this.uploadDir, filename);

    writeFileSync(filePath, file.buffer);
    
    // Return relative static asset URL (prefixed with /uploads)
    // The NestJS server is listening on http://localhost:3001, so client requests will fetch it from there
    const publicUrl = `http://localhost:3001/uploads/${filename}`;
    return publicUrl;
  }
}
