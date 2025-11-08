import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Firebase ID token obtained from Firebase Authentication',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjFkYzBmMTViM...',
  })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
