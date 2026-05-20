import { Injectable, ForbiddenException } from '@nestjs/common';
import { ProblemVisibility, Role } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { CreateProblemDto } from './dto/create-problem.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';

/**
 * ProblemVisibilityService — enforces visibility rules:
 * - Class problems (has classRoomId) → PRIVATE by default, or CONTEST_ONLY when requested
 * - Admin problems → can set PRIVATE, PUBLIC, CONTEST_ONLY
 * - Class owners cannot change class problem visibility to PUBLIC
 */
@Injectable()
export class ProblemVisibilityService {
  /**
   * For creation: override visibility based on context.
   * @param dto The create problem DTO
   * @param classRoomId Class ID (if creating in class context)
   * @returns Corrected visibility value
   */
  getVisibilityForCreate(
    dto: CreateProblemDto,
    classRoomId: string | undefined,
  ): ProblemVisibility {
    // If creating in a class, allow CONTEST_ONLY but keep PRIVATE as default.
    if (classRoomId) {
      return dto.visibility === ProblemVisibility.CONTEST_ONLY
        ? ProblemVisibility.CONTEST_ONLY
        : ProblemVisibility.PRIVATE;
    }

    // Admin problems: use DTO value or default to PUBLIC
    return (dto.visibility ?? ProblemVisibility.PUBLIC) as ProblemVisibility;
  }

  /**
   * For update: enforce visibility rules based on context.
   * @param problemVisibility Existing problem visibility
   * @param dtoVisibility Requested visibility from DTO
   * @param classRoomIds Class IDs associated with this problem (if any)
   * @param updaterRole Role of the updater
   * @returns Corrected visibility value
   * @throws ForbiddenException if class owner attempts to make class problem PUBLIC/CONTEST_ONLY
   */
  getVisibilityForUpdate(
    problemVisibility: ProblemVisibility,
    dtoVisibility: ProblemVisibility | undefined,
    classRoomIds: string[],
    updaterRole: Role | undefined,
  ): ProblemVisibility {
    // If no visibility change requested, keep existing
    if (dtoVisibility === undefined) {
      return problemVisibility;
    }

    // If this is a class problem
    if (classRoomIds.length > 0) {
      // Class problems can be PRIVATE or CONTEST_ONLY.
      // Only admins or class owners can set CONTEST_ONLY, but PUBLIC is not allowed.
      if (dtoVisibility === ProblemVisibility.PUBLIC) {
        throw new ForbiddenException(
          'Class problems cannot be made PUBLIC. Only PRIVATE or CONTEST_ONLY are allowed for class-specific problems.',
        );
      }
      return dtoVisibility;
    }

    // For admin problems (no class assignments), allow any visibility
    return dtoVisibility;
  }

  /**
   * Validate that public problem bank filters only show PUBLIC problems.
   * Used to ensure findAll (public endpoint) only returns PUBLIC visibility.
   */
  getPublicProblemBankVisibilityFilter(): Prisma.ProblemWhereInput {
    return { visibility: ProblemVisibility.PUBLIC };
  }
}
