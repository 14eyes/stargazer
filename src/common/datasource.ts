import { openDB, DBSchema } from 'idb'
import { Mutex, MutexGroup } from './mutex'

const repos = 'Dimbreath/StarRailData/'
const apiBase = 'https://api.github.com/repos/' + repos
const jsonBase = 'https://raw.githubusercontent.com/' + repos

console.log(`apiBase: ${apiBase}\njsonBase: ${jsonBase}`)

const configDBVersion = 1
interface ConfigDBv1 extends DBSchema 
{
    files: {
        key: string
        value: {
            hash: string
            path: string
            content: string
        }
    }
}

const configDB = openDB<ConfigDBv1>('configDB', configDBVersion, 
{
    upgrade(db, oldVersion, newVersion, _transaction, _event) 
    {
        console.log(`fileDB upgrading from ${oldVersion} to ${newVersion}`)
        db.createObjectStore('files', { keyPath: ['hash', 'path'], })
    },
    blocked(currentVersion, blockedVersion, _event) 
    {
        console.log(`fileDB blocked: currentVersion: ${currentVersion}, blockedVersion: ${blockedVersion}`)
    },
    blocking(currentVersion, blockedVersion, _event) 
    {
        console.log(`fileDB blocking: currentVersion: ${currentVersion}, blockedVersion: ${blockedVersion}`)
    },
    terminated() 
    {
        console.log(`fileDB terminated`)
    },
})

const retrieveJsonMutex = new MutexGroup()
export async function retrieveJson(request:string, commit:string, useApi:boolean) : Promise<any>
{
    let url = useApi ? apiBase : jsonBase
    if (!useApi && commit != null)
        url += `${commit}/`
    url += request

    return await retrieveJsonMutex.runExclusive(url, async () =>
    {
        const existing = await (await configDB).get('files', IDBKeyRange.only([commit, request]));
        if (existing?.hash)
            return JSON.parse(existing.content)
    
        const cache = useApi ? 'force-cache' : 'default'
        const result = await fetch(url, { headers: { 'Accept': 'application/json', }, cache })
            .then(response => response.json())
            .catch(error => console.log(`fileDB error: ${error}`))
        
        if (result)
        {
            await (await configDB).put('files', { hash:commit, path:request, content:JSON.stringify(result) })
            console.log(`fileDB stored ${request} @${commit}`)
        }
        return result
    })
}

export interface DataSourceCommit
{
    sha: string
    commit:
    {
        committer:
        {
            date: string
        }
        message: string
    }
}

const commitsCache:DataSourceCommit[] = []
const commitsMutex = new Mutex()
export async function retrieveCommits() : Promise<DataSourceCommit[]>
{
    return commitsMutex.runExclusive(async () => 
    {
        if (commitsCache.length == 0)
        {
            const commits = await fetch(apiBase + 'commits', { headers: { 'Accept': 'application/json', } })
                .then(response => response.json()) 

            for (const c of commits)
                commitsCache.push(c)
        }
        return commitsCache
    })
}
