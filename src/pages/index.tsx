import { ArrowUpIcon } from '@heroicons/react/24/solid'
import { useRouter } from 'next/router'
import { useState, useRef, useEffect, JSX } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { EllipsisHorizontalIcon } from '@heroicons/react/24/solid'

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
  const [leftWidth, setLeftWidth] = useState(480)
  const isDragging = useRef(false)
  const leftPanelRef = useRef<HTMLDivElement | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'preview' | 'workspace'>('preview')
  const [dropdownOpenId, setDropdownOpenId] = useState<string | null>(null)
  const [renameProjectId, setRenameProjectId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState<string>('')
  const promptRef = useRef<HTMLTextAreaElement | null>(null)
  const [creatingNewProject, setCreatingNewProject] = useState(false)
  const [highlightedProjectId, setHighlightedProjectId] = useState<string | null>(null)


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
    const minWidth = 320
    const maxWidth = Math.min(800, container.width - 200) // Ensure right panel has at least 200px
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

    if (projectId) {
      await supabase.from('messages').insert({
        project_id: projectId,
        role: 'user',
        content: prompt,
      })
    } else {
      const title = "New project"
      const res = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, name: title }),
      })

      const data = await res.json()
      if (res.ok) {
        const newProjectId = data.id
        setProjects(prev => [
          {
            id: newProjectId,
            name: title,
            prompt,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ])

        await supabase.from('messages').insert({
          project_id: newProjectId,
          role: 'user',
          content: prompt,
        })

        await router.push(`/?project_id=${newProjectId}`)
      } else {
        alert('Failed to create project.')
      }
    }
  }

  return (
    <div className="flex min-h-screen bg-[#262624]">
      <div
        className={`${isSidebarCollapsed ? 'w-15' : 'w-60'} h-screen bg-[#1f1e1d] text-black flex flex-col justify-between border-r transition-all duration-300 relative`}
        style={{ borderColor: '#4a4a47' }}
      >
        {isSidebarCollapsed && (
          <div
            className="absolute top-0 right-0 w-2 h-full cursor-e-resize z-50"
            onClick={() => setIsSidebarCollapsed(false)}
          />
        )}
        <div className={`${isSidebarCollapsed ? 'pl-1' : 'pl-3'} pr-1 pt-2 pb-2 flex-1`}>
          <div className="flex items-center justify-between mb-6" style={{ paddingLeft: isSidebarCollapsed ? '9px' : '1px' }}>
            <div className="flex items-center">
              <div className="text-white text-lg font-bold rounded-md w-0 h-10 flex items-center justify-center pl-3">
                T
              </div>
              <span
                className={`ml-1 transition-all duration-300 ease-in-out whitespace-nowrap ${isSidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'
                  }`}
              >
                <span className="text-xl font-bold text-white">ayyar</span>
              </span>
            </div>
            <button
              onClick={() => setIsSidebarCollapsed(true)}
              className={`text-white w-10 h-10 flex items-center justify-center transition text-2xl leading-none ${isSidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'
                }`}
            >
              «
            </button>
          </div>
          <div className="mb-15 relative h-1" style={{ paddingLeft: isSidebarCollapsed ? '9px' : '1px' }}>
            <button
              onClick={() => {
                setCreatingNewProject(true)
                router.push('/')
              }}
              className="flex items-center h-full text-[#d97757] font-semibold relative"
            >
              <span className="text-2xl w-6 h-full flex items-center justify-center">+</span>
              <span
                className={`ml-1 transition-all duration-300 ease-in-out whitespace-nowrap ${isSidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'
                  }`}
              >
                New Project
              </span>
            </button>
          </div>


          {!isSidebarCollapsed && (
            <>
              <h3 className="text-sm font-semibold text-[#aaa89f] mb-2">Projects</h3>
              <div className="space-y-0">
                {projects.map((project) => {
                  const isActive = project.id === projectId
                  const isTemporarilyHighlighted = highlightedProjectId === project.id && !isActive

                  return (
                    <div
                      key={project.id}
                      className={`relative group flex items-center justify-between px-3 py-1 rounded-lg transition project-dropdown
        ${(isActive || isTemporarilyHighlighted) ? 'bg-[#2f2f2f]' : 'hover:bg-[#2f2f2f]'}`}
                    >


                      {renameProjectId === project.id ? (
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter' && renameValue.trim()) {
                              const { error } = await supabase
                                .from('projects')
                                .update({ name: renameValue.trim() })
                                .eq('id', project.id)
                              if (!error) {
                                setProjects(prev =>
                                  prev.map(p =>
                                    p.id === project.id ? { ...p, name: renameValue.trim() } : p
                                  )
                                )
                              }
                              setRenameProjectId(null)
                            } else if (e.key === 'Escape') {
                              setRenameProjectId(null)
                            }
                          }}
                          className="text text-[#aaa89f] flex-1 bg-transparent border-none focus:outline-none px-0 py-0"
                        />

                      ) : (
                        <button
                          onClick={() => router.push(`/?project_id=${project.id}`)}
                          className={`text-left flex-1 truncate ${isActive ? 'text-[#aaa89f]' : 'text-[#aaa89f]'}`}
                        >
                          {project.name || 'Untitled'}
                        </button>
                      )}
                      <div className="relative">
                        <button
                          onClick={() => {
                            const newId = dropdownOpenId === project.id ? null : project.id
                            setDropdownOpenId(newId)
                            setHighlightedProjectId(newId)
                          }}

                          className={`ml-2 p-1 rounded transition ${dropdownOpenId === project.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}

                        >
                          <EllipsisHorizontalIcon className="h-5 w-5 text-[#94928b]" />
                        </button>
                        {dropdownOpenId === project.id && (
                          <div
                            className="absolute right-0 translate-x-[80px] mt-1 w-25 bg-[#30302e] border rounded-lg shadow-lg z-50 p-1"
                            style={{ borderColor: '#4a4a47' }}
                          >
                            <button
                              onClick={() => {
                                setRenameProjectId(project.id)
                                setRenameValue(project.name || '')
                                setDropdownOpenId(null)
                              }}
                              className="block w-full px-3 py-2 text-left text-sm text-[#94928b] hover:bg-[#555555] rounded-lg transition"
                            >
                              Rename
                            </button>
                            <button
                              onClick={() => handleDeleteProject(project.id)}
                              className="block w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-[#555555] rounded-lg transition"
                            >
                              Delete
                            </button>
                          </div>
                        )}

                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex flex-1 overflow-hidden">
          <div
            ref={leftPanelRef}
            style={{ width: leftWidth }}
            className="h-[calc(100vh)] flex flex-col bg-[#262624] pl-2 pr-2 pt-16 pb-1"
          >
            <div className="flex-1 overflow-y-auto space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`px-4 py-2 text-sm rounded-xl text-[#94928b] bg-[#181817] break-words w-fit max-w-[calc(100%-4rem)] ${msg.role === 'user' ? 'ml-auto text-left' : 'mr-auto text-left'}`}
                >
                  {msg.content.split('\n').map((line, idx) => (
                    <span key={idx}>
                      {line}
                      <br />
                    </span>
                  ))}
                </div>
              ))}
            </div>
            <form
              onSubmit={handleSubmit}
              className="mt-4 w-full px-1 rounded-lg bg-[#30302e] border py-3 hover:shadow-xl transition"
              style={{ borderColor: '#4a4a47' }}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e as unknown as React.FormEvent)
                  }
                }}
                placeholder="Message Tayyar"
                className="w-full bg-transparent text-[#aaa89f] text-sm placeholder-[#aaa89f] resize-none focus:outline-none py-0 px-4"
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
          <div className="flex-1 overflow-hidden pr-2 flex flex-col">
            <div className="flex space-x-1 px-4 pt-2 pb-1">
              <button
                onClick={() => setSelectedTab('workspace')}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${selectedTab === 'workspace'
                  ? 'bg-[#1f1e1d] text-[#aaa89f]'
                  : 'text-[#aaa89f] hover:bg-[#1f1e1d]'
                  }`}
              >
                Workspace
              </button>
              <button
                onClick={() => setSelectedTab('preview')}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${selectedTab === 'preview'
                  ? 'bg-[#1f1e1d] text-[#aaa89f]'
                  : 'text-[#aaa89f] hover:bg-[#1f1e1d]'
                  }`}
              >
                Preview
              </button>
            </div>
            <div className="flex items-center justify-center w-full h-[calc(100vh-40px)] relative py-1 pb-3">
              <div
                onMouseDown={handleMouseDown}
                className="absolute -left-px top-3 h-[95%] w-[2px] bg-[#4a4a47] cursor-col-resize z-10 rounded-t-full rounded-b-full"
              />
              <div className="w-full h-full rounded-lg bg-white border overflow-hidden max-w-[100%]" style={{ borderColor: '#4a4a47' }}>
                <div className="w-full h-full bg-[#30302e] overflow-auto p-6">
                  {selectedTab === 'preview' ? (
                    output || (
                      messages.length > 0 && (
                        <p className="text-[#aaa89f] text-sm">
                          Prompt: {messages[messages.length - 1].content}
                        </p>
                      )
                    )
                  ) : (
                    <div className="text-[#aaa89f] text-sm italic">Workspace content goes here…</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}