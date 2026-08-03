import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class CreateOrgDto {
  @IsString()
  @IsNotEmpty({ message: 'Organization name is required.' })
  @Length(2, 50, { message: 'Organization name must be between 2 and 50 characters.' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Organization slug is required.' })
  @Length(2, 30, { message: 'Slug must be between 2 and 30 characters.' })
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug can only contain lowercase alphanumeric characters and hyphens.' })
  slug!: string;
}
