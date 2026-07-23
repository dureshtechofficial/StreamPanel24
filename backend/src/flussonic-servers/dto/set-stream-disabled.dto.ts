import { IsBoolean } from 'class-validator';

/** Narrow DTO for the reseller/customer "disable"/"restart" stream actions — unlike the admin
 * route, these portals may only ever toggle this one field, never the rest of the stream config. */
export class SetStreamDisabledDto {
  @IsBoolean()
  disabled: boolean;
}
