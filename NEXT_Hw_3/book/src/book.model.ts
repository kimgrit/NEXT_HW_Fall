export interface BookDto {
  id: string;
  title: string;
  writer: string;
  publishedDt: Date;
  isAvailable?: boolean;
}
