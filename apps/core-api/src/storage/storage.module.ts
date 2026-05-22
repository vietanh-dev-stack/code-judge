import { Global, Module } from '@nestjs/common';
import { ProblemStorageAccessService } from './problem-storage-access.service';
import { StorageAccessService } from './storage-access.service';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';

@Global()
@Module({
  controllers: [StorageController],
  providers: [StorageService, ProblemStorageAccessService, StorageAccessService],
  exports: [StorageService, ProblemStorageAccessService, StorageAccessService],
})
export class StorageModule {}
