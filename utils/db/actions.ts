
import { supabase } from "@/utils/db/supabase"
import { v4 as uuidv4 } from 'uuid';

export const getRooms = async () => {
    try {
        let {data: Rooms, error } = await supabase
            .from('Rooms')
            .select('*')

       
        
        return Rooms

    } catch (error: any) {
        console.error('Error fetching data:', error.message)
    }
}

export const getStory = async (room_id: string) => {
    try {
        let { data: Story, error } = await supabase
            .from('Rooms')
            .select('*')
            .eq('room_id', room_id)

        if (error) {
            throw error
        }

        return Story

        

    } catch (error: any) {
        console.error('Error fetching data:', error.message)
    }
}


export const getStatus = async (room_id: string) => {
    try {
        let {data: Status, error } = await supabase
            .from('Status')
            .select('*')
            .eq('room_id', room_id)

        return Status

    } catch (error: any) {
        console.error('Error fetching data:', error.message)
    }

}


export const createNewRoom = async (title: string, content: string, genre: string) => {

    title = title ? title : 'New Story'
    content = content ? content : ' '

    const newUuid = uuidv4()

    try {
        let { data, error } = await supabase
            .from('Rooms')
            .insert([
                {
                    room_id: newUuid,
                    story_title: title , 
                    story_content: content ,
                    genre: genre,
                }
            ])

        if (error) {
            throw error
        }

        return data

    } catch (error: any) {
        console.error('Error fetching data:', error.message)
    }


}