import BadgeSupporter from '../../assets/imgs/badge-supporter.png';

export function badgeImage(type) {
  let src = '',
    alt = '';
  switch (type) {
    case 'supporter':
      src = BadgeSupporter;
      alt = 'supporter badge';
      break;
    default:
      throw new Error(`unknown badge type '${type}'`);
  }
  return {
    src,
    alt,
  };
}
