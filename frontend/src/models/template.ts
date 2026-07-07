export type TemplateJson = Record<string, unknown>

export type TemplateListResponse = {
  templates: string[]
}

export type TemplateResponse = {
  name: string
  content: TemplateJson
}
