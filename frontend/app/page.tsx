import LoginPage from "./components/login";
import ClientInit from "@/app/components/clientInit";

export default function Home() {
  return (
    <>
      <ClientInit />
      <LoginPage />
    </>
  );
}