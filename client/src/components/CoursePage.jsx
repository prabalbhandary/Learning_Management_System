import { coursePageStyles, coursePageCustomStyles } from "../assets/dummyStyles"
import courses from "../assets/dummyData"
import { Search, Star, StarHalf, User } from "lucide-react"
import { useNavigate } from "react-router-dom"

const StarIcon = ({filled = false, half = false, className=""}) => {
    if(half){
        return (
            <StarHalf className={`w-4 h-4 ${className}`} fill="currentColor" />
        )
    }
    return (
        <Star className={`w-4 h-4 ${className}`} fill={filled ? "currentColor" : "none"} />
    )
}

const UserIcon = () => <User className={coursePageStyles.teacherIcon} />

const SearchIcon = () => <Search className={coursePageStyles.searchIcon} />

const CoursePage = () => {
    const navigate = useNavigate();
  return (
    <div className={coursePageStyles.pageContainer}>
        <div className={coursePageStyles.headerContainer}>
            <div className={coursePageStyles.headerTransform}>
                <h1 className={coursePageStyles.headerTitle}>LEARN & GROW</h1>
            </div>
            <p className={coursePageStyles.headerSubtitle}>Master New Skills with Expert-Led Courses</p>
            <div className={coursePageStyles.searchContainer}>
                <div className={coursePageStyles.searchGradient} />
                <div className={coursePageStyles.searchInputContainer}>
                    <div className={coursePageStyles.searchIconContainer}></div>
                </div>
            </div>
        </div>
    </div>
  )
}

export default CoursePage