import { Module } from '@nestjs/common'
import { NewsPostsController } from './news-posts.controller.js'
import { NewsPostsService } from './news-posts.service.js'
import { NewsPostsRepository } from './news-posts.repository.js'

@Module({
  controllers: [NewsPostsController],
  providers: [NewsPostsService, NewsPostsRepository],
})
export class NewsPostsModule {}
