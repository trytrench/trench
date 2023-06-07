export const DeviceIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    width="64"
    height="110"
    viewBox="0 0 64 110"
  >
    <defs>
      <path
        id="desktop-b"
        d="M39.261408,48 L32,54.9028616 L25.2971618,48 L20,48 C17.790861,48 16,46.209139 16,44 L16,20 C16,17.790861 17.790861,16 20,16 L44,16 C46.209139,16 48,17.790861 48,20 L48,44 C48,46.209139 46.209139,48 44,48 L39.261408,48 Z"
      />
      <filter
        id="desktop-a"
        width="290.6%"
        height="256.8%"
        x="-95.3%"
        y="-52.7%"
        filterUnits="objectBoundingBox"
      >
        <feOffset dy="3" in="SourceAlpha" result="shadowOffsetOuter1" />
        <feGaussianBlur
          in="shadowOffsetOuter1"
          result="shadowBlurOuter1"
          stdDeviation="3"
        />
        <feColorMatrix
          in="shadowBlurOuter1"
          result="shadowMatrixOuter1"
          values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.07 0"
        />
        <feOffset dy="7" in="SourceAlpha" result="shadowOffsetOuter2" />
        <feGaussianBlur
          in="shadowOffsetOuter2"
          result="shadowBlurOuter2"
          stdDeviation="7"
        />
        <feColorMatrix
          in="shadowBlurOuter2"
          result="shadowMatrixOuter2"
          values="0 0 0 0 0.196078431   0 0 0 0 0.196078431   0 0 0 0 0.364705882  0 0 0 0.1 0"
        />
        <feMerge>
          <feMergeNode in="shadowMatrixOuter1" />
          <feMergeNode in="shadowMatrixOuter2" />
        </feMerge>
      </filter>
    </defs>
    <g fill="none" fill-rule="evenodd">
      <circle cx="32" cy="55" r="4" fill="#6772E5" />
      <circle cx="32" cy="55" r="8" fill="#6772E5" opacity=".3" />
      <use fill="#000" filter="url(#desktop-a)" xlinkHref="#desktop-b" />
      <use fill="#FFF" xlinkHref="#desktop-b" />
      <path
        fill="#32325D"
        d="M28.6638888,37 L26,37 C24.8494068,37 24,36.1045695 24,35 L24,26 C24,24.8954305 24.8460734,24 25.9966666,24 L38,24 C39.1505932,24 40,24.8954305 40,26 L40,35 C40,36.1045695 39.1505932,37 38,37 L35.3333333,37 C36.292161,37 37,37.6715729 37,38.5 C37,39.3284271 36.292161,40 35.3333333,40 L28.6666667,40 C27.707839,40 27,39.3284271 27,38.5 C27,37.6715729 27.7050611,37 28.6638888,37 Z M38.0033334,26 L26,26 L26,34 L38.0033334,34 L38.0033334,26 Z"
      />
    </g>
  </svg>
);

export const CardIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    width="64"
    height="110"
    viewBox="0 0 64 110"
  >
    <defs>
      <path
        id="card-b"
        d="M39.261408,48 L32,54.9028616 L25.2971618,48 L20,48 C17.790861,48 16,46.209139 16,44 L16,20 C16,17.790861 17.790861,16 20,16 L44,16 C46.209139,16 48,17.790861 48,20 L48,44 C48,46.209139 46.209139,48 44,48 L39.261408,48 Z"
      />
      <filter
        id="card-a"
        width="290.6%"
        height="256.8%"
        x="-95.3%"
        y="-52.7%"
        filterUnits="objectBoundingBox"
      >
        <feOffset dy="3" in="SourceAlpha" result="shadowOffsetOuter1" />
        <feGaussianBlur
          in="shadowOffsetOuter1"
          result="shadowBlurOuter1"
          stdDeviation="3"
        />
        <feColorMatrix
          in="shadowBlurOuter1"
          result="shadowMatrixOuter1"
          values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.07 0"
        />
        <feOffset dy="7" in="SourceAlpha" result="shadowOffsetOuter2" />
        <feGaussianBlur
          in="shadowOffsetOuter2"
          result="shadowBlurOuter2"
          stdDeviation="7"
        />
        <feColorMatrix
          in="shadowBlurOuter2"
          result="shadowMatrixOuter2"
          values="0 0 0 0 0.196078431   0 0 0 0 0.196078431   0 0 0 0 0.364705882  0 0 0 0.1 0"
        />
        <feMerge>
          <feMergeNode in="shadowMatrixOuter1" />
          <feMergeNode in="shadowMatrixOuter2" />
        </feMerge>
      </filter>
    </defs>
    <g fill="none" fill-rule="evenodd">
      <circle cx="32" cy="55" r="4" fill="#6772E5" />
      <circle cx="32" cy="55" r="8" fill="#6772E5" opacity=".3" />
      <use fill="#000" filter="url(#card-a)" xlinkHref="#card-b" />
      <use fill="#FFF" xlinkHref="#card-b" />
      <path
        fill="#32325D"
        d="M40,28 L24,28 L24,27.25 C24,26.5596441 24.4477153,26 25,26 L39,26 C39.5522847,26 40,26.5596441 40,27.25 L40,28 Z M40,30.5 L40,37 C40,37.5522847 39.5522847,38 39,38 L25,38 C24.4477153,38 24,37.5522847 24,37 L24,30.5 L40,30.5 Z M28,34 C27.4477153,34 27,34.4477153 27,35 C27,35.5522847 27.4477153,36 28,36 L29,36 C29.5522847,36 30,35.5522847 30,35 C30,34.4477153 29.5522847,34 29,34 L28,34 Z"
      />
    </g>
  </svg>
);

export const DeviceCardIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    width="88"
    height="110"
    viewBox="0 0 88 110"
  >
    <defs>
      <path
        id="carddesktop-b"
        d="M51.261408,48 L44,54.9028616 L37.2971618,48 L20,48 C17.790861,48 16,46.209139 16,44 L16,20 C16,17.790861 17.790861,16 20,16 L68,16 C70.209139,16 72,17.790861 72,20 L72,44 C72,46.209139 70.209139,48 68,48 L51.261408,48 Z"
      />
      <filter
        id="carddesktop-a"
        width="208.9%"
        height="256.8%"
        x="-54.5%"
        y="-52.7%"
        filterUnits="objectBoundingBox"
      >
        <feOffset dy="3" in="SourceAlpha" result="shadowOffsetOuter1" />
        <feGaussianBlur
          in="shadowOffsetOuter1"
          result="shadowBlurOuter1"
          stdDeviation="3"
        />
        <feColorMatrix
          in="shadowBlurOuter1"
          result="shadowMatrixOuter1"
          values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.07 0"
        />
        <feOffset dy="7" in="SourceAlpha" result="shadowOffsetOuter2" />
        <feGaussianBlur
          in="shadowOffsetOuter2"
          result="shadowBlurOuter2"
          stdDeviation="7"
        />
        <feColorMatrix
          in="shadowBlurOuter2"
          result="shadowMatrixOuter2"
          values="0 0 0 0 0.196078431   0 0 0 0 0.196078431   0 0 0 0 0.364705882  0 0 0 0.1 0"
        />
        <feMerge>
          <feMergeNode in="shadowMatrixOuter1" />
          <feMergeNode in="shadowMatrixOuter2" />
        </feMerge>
      </filter>
    </defs>
    <g fill="none" fill-rule="evenodd">
      <circle cx="44" cy="55" r="4" fill="#6772E5" />
      <circle cx="44" cy="55" r="8" fill="#6772E5" opacity=".3" />
      <use
        fill="#000"
        filter="url(#carddesktop-a)"
        xlinkHref="#carddesktop-b"
      />
      <use fill="#FFF" xlinkHref="#carddesktop-b" />
      <path
        fill="#32325D"
        d="M40 28L24 28 24 27.25C24 26.5596441 24.4477153 26 25 26L39 26C39.5522847 26 40 26.5596441 40 27.25L40 28zM40 30.5L40 37C40 37.5522847 39.5522847 38 39 38L25 38C24.4477153 38 24 37.5522847 24 37L24 30.5 40 30.5zM28 34C27.4477153 34 27 34.4477153 27 35 27 35.5522847 27.4477153 36 28 36L29 36C29.5522847 36 30 35.5522847 30 35 30 34.4477153 29.5522847 34 29 34L28 34zM52.6638888 37L50 37C48.8494068 37 48 36.1045695 48 35L48 26C48 24.8954305 48.8460734 24 49.9966666 24L62 24C63.1505932 24 64 24.8954305 64 26L64 35C64 36.1045695 63.1505932 37 62 37L59.3333333 37C60.292161 37 61 37.6715729 61 38.5 61 39.3284271 60.292161 40 59.3333333 40L52.6666667 40C51.707839 40 51 39.3284271 51 38.5 51 37.6715729 51.7050611 37 52.6638888 37zM62.0033334 26L50 26 50 34 62.0033334 34 62.0033334 26z"
      />
    </g>
  </svg>
);
