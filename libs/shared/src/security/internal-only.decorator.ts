import { SetMetadata } from '@nestjs/common';

export const INTERNAL_ONLY_KEY = 'internalOnly';
export const InternalOnly = () => SetMetadata(INTERNAL_ONLY_KEY, true);
