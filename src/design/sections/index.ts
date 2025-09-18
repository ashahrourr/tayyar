//src/design/sections/index.ts
import type { SectionModule } from '@/design/engine/sectionEngine'
import { headerModule } from './header/module'
import { heroModule } from './hero/module'


export const SECTION_MODULES: SectionModule[] = [
  headerModule,
  heroModule,
]
