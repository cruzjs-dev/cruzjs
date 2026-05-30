import { Navbar } from "./Navbar";

type AppLayoutProps = {
  children: React.ReactNode;
  fullWidth?: boolean;
};

const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  fullWidth = false,
}) => {
  return (
    <div className="min-h-screen bg-surface-light">
      <Navbar fullWidth={fullWidth} />
      <div
        className={`${fullWidth ? "px-6 pt-12 pb-4" : "max-w-screen-2xl mx-auto px-6 pt-12 pb-4"}`}
      >
        {children}
      </div>
    </div>
  );
};

export { AppLayout };
