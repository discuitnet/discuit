import BadgeSupporter from '../../../public/badge-supporter.png';

export function badgeImage(type: string): { src: string; alt: string } {
  const ret = {
    src: '',
    alt: '',
  };
  switch (type) {
    case 'supporter':
      ret.src = BadgeSupporter;
      ret.alt = 'supporter badge';
      break;
    default:
      throw new Error(`unknown badge type '${type}'`);
  }
  return ret;
}
