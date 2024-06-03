import Image from "next/image";
import profile from "/public/profile.png";
import big_logo_light from "/public/big_logo_light.png";
import big_logo_dark from "/public/big_logo_dark.png";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { redirect } from "next/navigation";

redirect("http://indiepa.ge/joshmccoy");

export default function Links() {
	return (
		<body>
			If you are not redirected automatically, follow this{" "}
			<a href="http://indiepa.ge/joshmccoy">link to example</a>.
		</body>
	);
}
