import { IsString, IsNotEmpty } from "class-validator";

export class QueryDto {
  @IsString()
  @IsNotEmpty()
  query: string;
}
