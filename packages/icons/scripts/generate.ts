import {join} from "node:path";
import downloadMaterialFiles from './download/material'
import downloadPhosphorFiles from './download/phosphor'
import downloadFluentuiSystemFiles from './download/fluentuiSystem'
import downloadLucideFiles from './download/lucide'

const ASSETS_PATH = join(__dirname, '..', 'assets')
const BATCH_SIZE = 500

const main = async () => {
	await downloadMaterialFiles(ASSETS_PATH, BATCH_SIZE);
	await downloadPhosphorFiles(ASSETS_PATH, BATCH_SIZE);
	await downloadFluentuiSystemFiles(ASSETS_PATH, BATCH_SIZE)
	await downloadLucideFiles(ASSETS_PATH, BATCH_SIZE)
}

main()
