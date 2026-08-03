import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  async chat(
    @Body('message') message: string,
    @Body('boardContext') boardContext?: string,
  ) {
    const response = await this.aiService.chat(message, boardContext);
    return { response };
  }

  @Post('generate-architecture')
  async generateArchitecture(@Body('prompt') prompt: string) {
    const layout = await this.aiService.generateArchitecture(prompt);
    return layout;
  }

  @Post('generate-documentation')
  async generateDocumentation(@Body('boardState') boardState: string) {
    const documentation = await this.aiService.generateDocumentation(boardState);
    return { documentation };
  }

  @Post('notes-to-uml')
  async notesToUml(@Body('notes') notes: string) {
    const layout = await this.aiService.notesToUml(notes);
    return layout;
  }
}
