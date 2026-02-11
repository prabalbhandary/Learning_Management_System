import { facultyStyles } from "../assets/dummyStyles"
import sampleTeachers from "../assets/dummyFaculty"

const FacultyPage = () => {
  return (
    <div className={facultyStyles.container}>
        <div className={facultyStyles.header}>
            <div className={facultyStyles.headerContent}>
                <h1 className={facultyStyles.title}>Meet Our Faculty</h1>
                <div className={facultyStyles.titleDivider}></div>
                <p className={facultyStyles.subtitle}>Learn from industry experts and academic pioneers dedicated to your success</p>
            </div>
        </div>
    </div>
  )
}

export default FacultyPage
