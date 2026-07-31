import { IsArray, IsString, IsNotEmpty, ArrayMaxSize } from 'class-validator'

/**
 * Body for the internal batch person lookup.
 *
 * Used by other services to hydrate customer display fields after their own
 * query, instead of JOINing `people.persons` directly.
 */
export class BatchPeopleDto {
  /**
   * Person ids to look up. Unknown ids are skipped rather than erroring — the
   * caller is filling in a list, and one missing person should leave blank
   * fields, not fail the request.
   *
   * Capped so a caller cannot ask for an unbounded set in one request; booking's
   * page size is well inside this.
   */
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  ids!: string[]
}
