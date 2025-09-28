import Image from "next/image";
import {Button} from "@/components/ui/button";

export default function Home() {
  return (
      <div className="flex items-center justify-center h-screen">
          <Button className="cursor-pointer">Click me</Button>
      </div>
  );
}
