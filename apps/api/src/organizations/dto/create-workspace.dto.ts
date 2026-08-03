import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateWorkspaceDto {
  @IsString()
  @IsNotEmpty({ message: 'Workspace name is required.' })
  @Length(2, 50, { message: 'Workspace name must be between 2 and 50 characters.' })
  name!: string;
}
