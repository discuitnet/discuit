import { useHistory } from 'react-router-dom';
import Button from '../Button';

export default function GoBackNavbar() {
  const history = useHistory();
  return (
    <Button onClick={() => history.goBack()} variant="text" noBackground icon={<SVGLongArrow />}>
      Back
    </Button>
  );
}

// This element is copy-pasted and slightly modified from SVGs.tsx.
function SVGLongArrow() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: 'rotate(90deg)' }}
    >
      <path
        d="M11.9991 21.2501C11.8091 21.2501 11.6191 21.1801 11.4691 21.0301L5.39914 14.9601C5.10914 14.6701 5.10914 14.1901 5.39914 13.9001C5.68914 13.6101 6.16914 13.6101 6.45914 13.9001L11.9991 19.4401L17.5391 13.9001C17.8291 13.6101 18.3091 13.6101 18.5991 13.9001C18.8891 14.1901 18.8891 14.6701 18.5991 14.9601L12.5291 21.0301C12.3791 21.1801 12.1891 21.2501 11.9991 21.2501Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={1}
      />
      <path
        d="M12 21.08C11.59 21.08 11.25 20.74 11.25 20.33V3.5C11.25 3.09 11.59 2.75 12 2.75C12.41 2.75 12.75 3.09 12.75 3.5V20.33C12.75 20.74 12.41 21.08 12 21.08Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={1}
      />
    </svg>
  );
}
