import { useLocation } from 'react-router-dom';

const Placeholder = () => {
  const { pathname } = useLocation();
  const name = pathname.split('/').pop() ?? '';

  return (
    <div className="space-y-2">
      <h1 className="text-3xl capitalize">{name}</h1>
      <p className="text-muted-foreground">This page is coming soon.</p>
    </div>
  );
};

export default Placeholder;
