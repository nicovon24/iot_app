import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const TB_ID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

@Injectable()
export class ParseTbIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!TB_ID_RE.test(value)) {
      throw new BadRequestException('Invalid entity id');
    }
    return value;
  }
}
