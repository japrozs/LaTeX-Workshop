import type { PDFViewer } from '../latexworkshop'
import type { IPDFViewerApplication } from './interface.js'
import { getTrimScale } from './pagetrimmer.js'

declare const PDFViewerApplication: IPDFViewerApplication

export class SyncTex {
    reverseSynctexKeybinding: string = 'ctrl-click'

    constructor(private readonly lwViewer: PDFViewer) {
        // Since DOM of each page is recreated when a PDF document is reloaded,
        // we must register listeners every time.
        this.lwViewer.onEvent('pagesinit', () => {
            this.registerListenerOnEachPage()
        })
    }

    private callSynctex(e: MouseEvent, page: number, pageDom: HTMLElement, viewerContainer: HTMLElement) {
        const canvasDom = pageDom.getElementsByTagName('canvas')[0]
        const selection = window.getSelection()
        let textBeforeSelection = ''
        let textAfterSelection = ''
        // workaround for https://github.com/James-Yu/LaTeX-Workshop/issues/1314
        if(selection && selection.anchorNode && selection.anchorNode.nodeName === '#text'){
            const text = selection.anchorNode.textContent
            if (text) {
                textBeforeSelection = text.substring(0, selection.anchorOffset)
                textAfterSelection = text.substring(selection.anchorOffset)
            }
        }
        const trimSelect = document.getElementById('trimSelect') as HTMLSelectElement
        let left = e.pageX - pageDom.offsetLeft + viewerContainer.scrollLeft
        const top = e.pageY - pageDom.offsetTop + viewerContainer.scrollTop
        if (trimSelect.selectedIndex > 0) {
            left = (left - canvasDom.offsetLeft) / getTrimScale()
        }
        const pos = PDFViewerApplication.pdfViewer._pages[page-1].getPagePoint(left, (pageDom.offsetHeight - top) / getTrimScale())
        this.lwViewer.send({type: 'reverse_synctex', pdfFileUri: this.lwViewer.pdfFileUri, pos, page, textBeforeSelection, textAfterSelection})
    }

    registerListenerOnEachPage() {
        const keybinding = this.reverseSynctexKeybinding
        const viewerDom = document.getElementById('viewer') as HTMLElement
        for (const pageDom of viewerDom.childNodes as NodeListOf<HTMLElement>) {
            const page = Number(pageDom.dataset.pageNumber)
            const viewerContainer = document.getElementById('viewerContainer') as HTMLElement
            switch (keybinding) {
                case 'ctrl-click': {
                    pageDom.onclick = (e) => {
                        if (!(e.ctrlKey || e.metaKey)) {
                            return
                        }
                        this.callSynctex(e, page, pageDom, viewerContainer)
                    }
                    break
                }
                case 'double-click': {
                    pageDom.ondblclick = (e) => {
                        this.callSynctex(e, page, pageDom, viewerContainer)
                    }
                    break
                }
                default: {
                    console.log(`Unknown keybinding ${keybinding} (view.pdf.internal.synctex.keybinding)`)
                    break
                }
            }
        }
    }
}
