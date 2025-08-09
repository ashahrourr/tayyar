// pages/index.tsx
import { ArrowUpIcon } from '@heroicons/react/24/solid'
import { useRouter } from 'next/router'
import { useState, useRef, useEffect, JSX } from 'react'
import { supabase } from '@/SupaBase/supabaseClient'
import { mockPages } from '@/lib/mockComponents';
import { RenderComponent } from '@/CanvasRender/renderComponent'
import { UIComponent } from '@/lib/types'
import { flattenComponents } from '@/utils/flattenComponents'
import { updateComponentTree } from '@/utils/updateComponentTree'
import { LayerItem } from '@/LeftSideBar/LayerItem'
import { buildComponentTree } from '@/utils/buildComponentTree'
import {
  getCurrentTextSize,
  shiftTextSize,
  getCurrentPadding,
  setPadding,
  getCurrentColor,
  setColor,
  setInlineColor,
} from '@/RightSideBar/tailwindHelpers'
import { RenderPreview } from '@/CanvasRender/renderPreview';


interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface Project {
  id: string
  name: string
  prompt: string
  created_at: string
}

export default function Home() {
  const router = useRouter()
  const projectId = router.query.project_id as string | undefined

  const [promptDrafts, setPromptDrafts] = useState<Record<string, string>>({})
  const prompt = promptDrafts[projectId ?? ''] ?? ''
  const [output, setOutput] = useState<JSX.Element | null>(null)
  const [leftWidth, setLeftWidth] = useState(230)
  const [rightWidth, setRightWidth] = useState(230)
  const isDragging = useRef(false)
  const leftPanelRef = useRef<HTMLDivElement | null>(null)
  const rightPanelRef = useRef<HTMLDivElement | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedTab, setSelectedTab] = useState<'edit' | 'workspace'>('edit')
  const [dropdownOpenId, setDropdownOpenId] = useState<string | null>(null)
  const [renameProjectId, setRenameProjectId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState<string>('')
  const promptRef = useRef<HTMLTextAreaElement | null>(null)
  const [creatingNewProject, setCreatingNewProject] = useState(false)
  const [highlightedProjectId, setHighlightedProjectId] = useState<string | null>(null)
  const [workspaceCode, setWorkspaceCode] = useState<string>('')
  const [pages, setPages] = useState<typeof mockPages>([])
  const [currentPageId, setCurrentPageId] = useState('page-1')
  const currentPage = pages.find(p => p.id === currentPageId)
  const components = currentPage?.components ?? []
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [focused, setFocused] = useState(false)
  const layerTree = buildComponentTree(components)
  const selectedComponent = components.find(c => c.id === selectedId)
  const TEXT_EDITABLE = ['Text', 'Button', 'Input'];
  const PADDING_EDITABLE = ['Container', 'Card', 'Button', 'Input', 'Form'];
  const TEXT_COLOR_EDITABLE = ['Text', 'Button', 'Input'];
  const BG_COLOR_EDITABLE = ['Container', 'Card', 'Button', 'Input', 'Form'];
  // state (put near the top after other useState calls)
const [mode, setMode]           = useState<'edit'|'preview'>('edit')


// near other derivations
const flattened = flattenComponents(components)
const pageHeight = Math.max(
  756,
  flattened.reduce((m, c) => {
    const y = typeof c.y === 'number' ? c.y : 0
    const h =
      typeof c.h === 'number'
        ? c.h
        : parseInt(String(c.h || 0), 10) || 0
    return Math.max(m, y + h)
  }, 0) + 24 // a little bottom padding
)









  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      isDragging.current = true
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current || !leftPanelRef.current) return
    const container = leftPanelRef.current.parentElement?.getBoundingClientRect()
    if (!container) return

    const newWidth = e.clientX - container.left
    const minWidth = 200
    const maxWidth = Math.min(400, container.width - 200)
    setLeftWidth(Math.max(minWidth, Math.min(newWidth, maxWidth)))
  }

  const handleMouseUp = () => {
    if (isDragging.current) {
      isDragging.current = false
      document.body.style.cursor = 'default'
      document.body.style.userSelect = ''
    }
  }

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName
      const isTypingInInput =
        activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT' || (document.activeElement as HTMLElement)?.isContentEditable

      if (!isTypingInInput) {
        promptRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  useEffect(() => {
    if (!projectId) {
      setPages(mockPages)
    }
  }, [projectId])
  




  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.project-dropdown')) {
        setDropdownOpenId(null)
        setHighlightedProjectId(null)
      }
    }

    window.addEventListener('click', handleClickOutside)
    return () => {
      window.removeEventListener('click', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (projectId) {
      setTimeout(() => {
        promptRef.current?.focus()
      }, 0)
    }
  }, [projectId])

  useEffect(() => {
    const fetchMessages = async () => {
      if (!projectId) return
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })

      if (!error) {
        setMessages(data || [])
      } else {
        console.error('Error loading messages:', error)
      }
    }

    fetchMessages()
  }, [projectId])

  useEffect(() => {
    const fetchProjects = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error) {
        setProjects(data || [])
      }
    }

    fetchProjects()
  }, [])

  useEffect(() => {
    if (!projectId) {
      setMessages([])
      setOutput(null)
      setTimeout(() => {
        promptRef.current?.focus()
      }, 0)
    }
  }, [projectId])

  useEffect(() => {
    if (creatingNewProject) {
      setTimeout(() => {
        promptRef.current?.focus()
        setCreatingNewProject(false)
      }, 0)
    }
  }, [creatingNewProject])

  useEffect(() => {
    if (canvasRef.current) {
      const width = canvasRef.current.offsetWidth
      const height = canvasRef.current.offsetHeight
      console.log('Canvas size:', width, 'x', height)
    }
  }, [])

  const handleDeleteProject = async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id)

    if (error) {
      console.error('Failed to delete project:', error.message)
      alert('Error deleting project.')
      return
    }

    setProjects((prev) => prev.filter((p) => p.id !== id))
    if (projectId === id) {
      router.push('/')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    const tempMessage = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      content: prompt,
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, tempMessage])
    setPromptDrafts(prev => ({
      ...prev,
      [projectId ?? '']: '',
    }))
    promptRef.current?.focus()

    let currentProjectId = projectId

    if (projectId) {
      await supabase.from('messages').insert({
        project_id: projectId,
        role: 'user',
        content: prompt,
      })
    } else {
      const title = "New project"
      const res = await fetch('/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, name: title }),
      })

      const data = await res.json()
      if (res.ok) {
        currentProjectId = data.id
        setProjects(prev => [
          {
            id: data.id,
            name: title,
            prompt,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ])

        await supabase.from('messages').insert({
          project_id: data.id,
          role: 'user',
          content: prompt,
        })

        await router.push(`/?project_id=${data.id}`)
      } else {
        alert('Failed to create project.')
        return
      }
    }
  }

  function handleUpdate(id: string, updates: Partial<UIComponent>) {
    setPages(prev =>
      prev.map(p =>
        p.id === currentPageId
          ? { ...p, components: updateComponentTree(p.components, id, updates) }
          : p
      )
    )
  }
  
  

  return (
    <div className="flex flex-col min-h-screen bg-[#262624]">
      {/* Header */}
      <header className="h-14 bg-[#1f1e1d] border-b flex items-center justify-between px-4 sticky top-0 z-50" style={{ borderColor: '#4a4a47' }}>
        <div className="flex items-center">
          <span className="text-xl font-bold text-white">Tayyar</span>
        </div>
        <div className="flex items-center space-x-4">
  <button
    onClick={() => setMode('edit')}
    className={mode==='edit' ? 'text-white font-semibold' : 'text-[#aaa89f] hover:text-white'}
  >
    Edit
  </button>
  <button
    onClick={() => setMode('preview')}
    className={mode==='preview' ? 'text-white font-semibold' : 'text-[#aaa89f] hover:text-white'}
  >
    Preview
  </button>

        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 h-[calc(100vh-3.5rem)]">
        {/* Left Sidebar (Projects) */}
        <div
          ref={leftPanelRef}
          className="min-h-screen min-w-[230px] bg-[#1f1e1d] border-r relative"
          style={{ borderColor: '#4a4a47', width: `${leftWidth}px` }}
        >

          {/* Placeholder content to ensure rendering */}
          <div
            ref={leftPanelRef}
            className="min-h-screen min-w-[230px] bg-[#1f1e1d] border-r relative"
            style={{ borderColor: '#4a4a47', width: `${leftWidth}px` }}
          >

            <div className="p-4 text-[#aaa89f] overflow-y-auto h-full max-h-[calc(100vh-3.5rem)]">
            <div className="mb-4 space-y-1">
  <h2 className="text-white font-bold text-sm">Pages</h2>
  {pages.map(p => (
    <button
      key={p.id}
      onClick={() => {
        setCurrentPageId(p.id)
        setSelectedId(null)
      }}
      className={`block w-full text-left px-2 py-1 rounded ${
        p.id === currentPageId
          ? 'bg-[#444] text-white'
          : 'text-[#aaa89f] hover:bg-[#333]'
      }`}
    >
      {p.name}
    </button>
  ))}
</div>

              <h2 className="text-white font-bold text-sm mb-2">Layers</h2>

              {layerTree.map(root => (
                <LayerItem
                  key={root.id}
                  comp={root}
                  selectedId={selectedId}
                  setSelectedId={setSelectedId}
                  depth={0}
                />
              ))}
            </div>
          </div>


        </div>

{/* Canvas viewport */}
<div className="w-full h-[756px] bg-[#30302e] relative" style={{ borderColor: '#4a4a47' }}>
  {/* scroll container */}
  <div className="w-full h-full overflow-y-auto overflow-x-hidden">
    {/* content wrapper (true page height) */}
    <div
      ref={canvasRef}                      // <— important: ref on the CONTENT, not the viewport
      className="relative w-full"
      style={{ height: pageHeight }}
      onClick={() => setSelectedId(null)}
    >
      {mode === 'edit' ? (
        flattenComponents(components).map(comp => (
          <RenderComponent
            key={comp.id}
            comp={comp}
            mode="edit"
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            updateComponent={handleUpdate}
            canvasRef={canvasRef}        // <— now points to full-height content
          />
        ))
      ) : (
        <RenderPreview components={components} navigate={setCurrentPageId} />
      )}
    </div>

            {/* Prompt Box */}
            <form
              onSubmit={handleSubmit}
              className={`absolute bottom-4 left-0 right-0 mx-4 rounded-lg border py-3 shadow-lg transition-all duration-300 ${focused
                ? 'bg-[#30302e] border-[#d97757]'
                : 'bg-[#30302e]/70 border-[#4a4a47]'
                }`}
            >
              <textarea
                ref={promptRef}
                rows={3}
                value={prompt}
                onChange={(e) => {
                  const val = e.target.value
                  setPromptDrafts(prev => ({
                    ...prev,
                    [projectId ?? '']: val,
                  }))
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e as unknown as React.FormEvent)
                  }
                }}
                placeholder="Message Tayyar"
                className="w-full bg-transparent text-[#ccc] text-sm placeholder-[#aaa89f] resize-none focus:outline-none py-0 px-4"
              />
              <div className="flex justify-end mt-4 pr-4">
                <button
                  type="submit"
                  className="p-3 bg-[#d97757] text-white rounded-full transition flex items-center gap-1"
                  disabled={!prompt.trim()}
                >
                  <ArrowUpIcon className="w-4 h-4" />
                </button>
              </div>
            </form>

          </div>
        </div>

        {/* Right Sidebar (Messages + Tabs) */}
        <div
          ref={rightPanelRef}
          className="min-h-screen min-w-[230px] bg-[#1f1e1d] border-l relative"
          style={{ borderColor: '#4a4a47', width: `${rightWidth}px` }}
        >
          <div className="p-4 text-[#aaa89f]">
            <h2 className="text-white font-bold text-sm mb-2">Properties</h2>

            {selectedComponent ? (
              <div className="space-y-3 text-sm">
                {/* ----- Type (read-only) ----- */}
                <div>
                  <label className="block text-[#aaa89f] mb-1">Type</label>
                  <div className="bg-[#2b2b2a] p-2 rounded">{selectedComponent.type}</div>
                </div>

                {/* ----- Position & Size ----- */}
                {['x', 'y', 'w', 'h'].map((field) => (
                  <div key={field}>
                    <label className="block text-[#aaa89f] mb-1">{field.toUpperCase()}</label>
                    <input
                      type="number"
                      className="w-full bg-[#2b2b2a] text-white p-2 rounded outline-none"
                      value={selectedComponent[field as 'x' | 'y' | 'w' | 'h'] ?? ''}
                      onChange={(e) =>
                        handleUpdate(selectedComponent.id, {
                          [field]: parseInt(e.target.value, 10) || 0,
                        })
                      }
                    />
                  </div>
                ))}

                {/* ----- Text size (only for text-based comps) ----- */}
                {TEXT_EDITABLE.includes(selectedComponent.type) && (
                  <div>
                    <label className="block text-[#aaa89f] mb-1">Text size</label>
                    <div className="flex items-center gap-2">
                      <button
                        className="bg-[#2b2b2a] px-3 py-1 rounded"
                        onClick={() =>
                          handleUpdate(selectedComponent.id, {
                            props: {
                              ...selectedComponent.props,
                              className: shiftTextSize(selectedComponent.props.className, -1),
                            },
                          })
                        }
                      >
                        −
                      </button>
                      <span className="flex-1 text-center bg-[#2b2b2a] py-1 rounded">
                        {getCurrentTextSize(selectedComponent.props.className)}
                      </span>
                      <button
                        className="bg-[#2b2b2a] px-3 py-1 rounded"
                        onClick={() =>
                          handleUpdate(selectedComponent.id, {
                            props: {
                              ...selectedComponent.props,
                              className: shiftTextSize(selectedComponent.props.className, +1),
                            },
                          })
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {/* ----- Padding (only for layout comps) ----- */}
                {PADDING_EDITABLE.includes(selectedComponent.type) && (
                  <div>
                    <label className="block text-[#aaa89f] mb-1">Padding</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={12}
                        value={getCurrentPadding(selectedComponent.props.className)}
                        onChange={(e) =>
                          handleUpdate(selectedComponent.id, {
                            props: {
                              ...selectedComponent.props,
                              className: setPadding(
                                selectedComponent.props.className,
                                Number(e.target.value)
                              ),
                            },
                          })
                        }
                        className="flex-1"
                      />
                      <span className="w-8 text-center">
                        {getCurrentPadding(selectedComponent.props.className)}
                      </span>
                    </div>
                  </div>
                )}

                {/* ---- Text colour ---- */}
                {TEXT_COLOR_EDITABLE.includes(selectedComponent.type) && (
                  <div>
                    <label className="block text-[#aaa89f] mb-1">Text colour</label>
                    <input
                      type="color"
                      value={getCurrentColor(
                        selectedComponent.props.className,
                        'text',
                        selectedComponent.props.style
                      )}

                      onChange={(e) =>
                        handleUpdate(selectedComponent.id, {
                          props: {
                            ...selectedComponent.props,
                            // Remove any text colour classes so Tailwind doesn't override us
                            className: setColor(selectedComponent.props.className, 'text', ''),
                            style: setInlineColor(
                              selectedComponent.props.style,
                              'text',
                              e.target.value
                            ),
                          },
                        })
                      }
                      className="w-full h-10 p-0 border-0 bg-transparent"
                    />
                  </div>
                )}

                {/* ---- Background colour ---- */}
                {BG_COLOR_EDITABLE.includes(selectedComponent.type) && (
                  <div>
                    <label className="block text-[#aaa89f] mb-1">Background</label>
                    <input
                      type="color"
                      value={getCurrentColor(
                        selectedComponent.props.className,
                        'bg',
                        selectedComponent.props.style
                      )}

                      onChange={(e) =>
                        handleUpdate(selectedComponent.id, {
                          props: {
                            ...selectedComponent.props,
                            className: setColor(selectedComponent.props.className, 'bg', ''),
                            style: setInlineColor(
                              selectedComponent.props.style,
                              'bg',
                              e.target.value
                            ),
                          },
                        })
                      }
                      className="w-full h-10 p-0 border-0 bg-transparent"
                    />
                  </div>
                )}



                {/* ----- Fallback: raw prop editor (advanced) ----- */}
                <details className="mt-4">
                  <summary className="cursor-pointer select-none text-[#aaa89f]">
                    Advanced props
                  </summary>
                  {Object.entries(selectedComponent.props).map(([key, value]) => (
                    <div className="mt-2" key={key}>
                      <label className="block text-[#aaa89f] mb-1">{key}</label>
                      <input
                        className="w-full bg-[#2b2b2a] text-white p-2 rounded outline-none"
                        value={String(value)}
                        onChange={(e) =>
                          handleUpdate(selectedComponent.id, {
                            props: {
                              ...selectedComponent.props,
                              [key]: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  ))}
                </details>
              </div>

            ) : (
              <p className="text-[#777] text-sm">Select a component to edit</p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
