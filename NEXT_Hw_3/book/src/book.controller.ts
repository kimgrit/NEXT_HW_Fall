import {
  Controller,
  Param,
  Body,
  Delete,
  Get,
  Post,
  Put,
} from '@nestjs/common';
import { BookService } from './book.service';

@Controller('book')
export class BookController {
  bookService: BookService;
  constructor() {
    this.bookService = new BookService();
  }

  @Get()
  getAllPosts() {
    console.log('모든 책 가져오기');
    return this.bookService.getAllPosts();
  }

  @Post()
  createPost(@Body() postDto) {
    console.log('새로운 책 추가');
    this.bookService.createPost(postDto);
    return 'success';
  }

  @Get('/:id')
  getPost(@Param('id') id: string) {
    console.log(['책 한 권 조회']);
    return this.bookService.getPost(id);
  }

  @Delete('/:id')
  deletePost(@Param('id') id: string) {
    console.log('책 삭제');
    this.bookService.delete(id);
    return 'success';
  }

  @Put('/:id')
  updatePost(@Param('id') id: string, @Body() postDto) {
    console.log('책 정보 업데이트', id, postDto);
    return this.bookService.updatePost(id, postDto);
  }
}
