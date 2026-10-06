import { CookingMode } from '../features/cooking/CookingMode'
import { demo } from './DemoRecipe'

export default function DemoCooking() {
  return <CookingMode r={demo} servings={8} />
}
