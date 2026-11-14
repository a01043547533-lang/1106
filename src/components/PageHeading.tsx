// 1탄 design.jsx의 PageHeading과 같은 마크업(서버·클라이언트 어디서나 쓰도록 훅 없이)
export function PageHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="page-heading">
      <h1 tabIndex={-1}>{title}</h1>
      {description && <p className="lead">{description}</p>}
    </div>
  );
}
