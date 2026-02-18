import { useState } from "react";
import { navbarStyles } from "../assets/dummyStyles"
import Logo from "../assets/logo.png"
import { useLocation } from "react-router-dom";
import { useRef } from "react";
import { LayoutDashboard, PlusCircle, ListChecks } from "lucide-react";

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const location = useLocation();
    const menuRef = useRef(null);
    const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/" },
    {
      id: "addcourse",
      label: "Add Course",
      icon: PlusCircle,
      path: "/addcourse",
    },
    {
      id: "listcourse",
      label: "List Courses",
      icon: ListChecks,
      path: "/listcourse",
    },
    { id: "bookings", label: "Bookings", icon: ListChecks, path: "/bookings" },
  ];
  return (
    <>
        <nav className={navbarStyles.nav(isVisible)}>
            <div className={navbarStyles.navContainer}></div>
        </nav>
    </>
  )
}

export default Navbar