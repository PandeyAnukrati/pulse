import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommentsService } from './comments.service';

@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('workspace/:boardId')
  async getComments(@Param('boardId') boardId: string) {
    return this.commentsService.listComments(boardId);
  }

  @Post()
  async createComment(
    @Req() req: any,
    @Body('workspaceId') workspaceId: string,
    @Body('content') content: string,
    @Body('x') x: number,
    @Body('y') y: number,
    @Body('nodeId') nodeId?: string,
    @Body('parentId') parentId?: string
  ) {
    return this.commentsService.createComment(
      req.user.id,
      workspaceId,
      content,
      x,
      y,
      nodeId,
      parentId
    );
  }

  @Patch(':commentId/resolve')
  async resolveComment(
    @Param('commentId') commentId: string,
    @Body('isResolved') isResolved: boolean
  ) {
    return this.commentsService.resolveComment(commentId, isResolved);
  }

  @Delete(':commentId')
  async deleteComment(@Req() req: any, @Param('commentId') commentId: string) {
    return this.commentsService.deleteComment(req.user.id, commentId);
  }
}
