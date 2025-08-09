import { Request, Response } from 'express';
import { printerManager } from '../../src/main/services/PrinterManager';

class PrinterController {
  public getSettings = async (_req: Request, res: Response) => {
    res.json({ success: true, data: printerManager.getSettings() });
  };

  public setSettings = async (req: Request, res: Response) => {
    const next = req.body || {};
    const data = printerManager.setSettings(next);
    res.json({ success: true, data });
  };

  public list = async (_req: Request, res: Response) => {
    res.json({ success: true, data: printerManager.listPrinters() });
  };

  public addIP = async (req: Request, res: Response) => {
    const dev = printerManager.addIPPrinter(req.body);
    res.json({ success: true, data: dev });
  };

  public setActive = async (req: Request, res: Response) => {
    printerManager.setActivePrinter(req.body.id);
    res.json({ success: true });
  };

  public remove = async (req: Request, res: Response) => {
    printerManager.removePrinter(req.params.id);
    res.json({ success: true });
  };

  public printTest = async (req: Request, res: Response) => {
    await printerManager.printTest(req.body?.id);
    res.json({ success: true });
  };

  public printJob = async (req: Request, res: Response) => {
    await printerManager.printJob(req.body);
    res.json({ success: true });
  };

  public printSample = async (req: Request, res: Response) => {
    const { type, printerId } = req.body;
    await printerManager.printSample(type, printerId);
    res.json({ success: true });
  };

  public discoverIP = async (req: Request, res: Response) => {
    const list = await printerManager.discoverIPPrinters(req.body);
    res.json({ success: true, data: list });
  };
}

export const printerController = new PrinterController();


