from agents import build_reader_agent , build_search_agent , writer_chain , critic_chain
from rich import print
def run_research_pipeline(topic : str ) -> dict:
    # state

    state = {}

    # search agent working

    print("\n" +"*" * 50)
    print("Step 1 - Search agent is working ...")
    print("=" * 50)

    search_agent = build_search_agent()

    search_result = search_agent.invoke({
        "messages" : [("user" , f"Find the recent , reliable and detailed information about : {topic}")]
    })


    state["search_result"] = search_result['messages'][-1].content

    print("\n Search result" ,state["search_result"] )

    # step - 2 Reader agent (web scrapping)

    print("\n" , "*" * 50)
    print("step 2 - reader agent is scraping top resources")
    print("*" * 50)

    reader_agent = build_reader_agent()
    reader_result = reader_agent.invoke({
        "messages":[(
            "user" ,
            f"Based on the following search result about '{topic} ,"
            f"pick the most relevant URL and scrape it for deeper content \n\n"
            f"Search Results:\n{state['search_result']}"
        )]
    })
    print(reader_result)
    state["scraped_content"] = reader_result["messages"][-1].content 

    print("\n Scraped content\n", state["scraped_content"] )

    # step 3 writer chain

    print("\n" +"*" * 50)
    print("Step 1 - writer chain is working ...")
    print("=" * 50)


    research_combined = (
        f"SEARCH RESULTS : \n {state['search_result']}\n\n"
        f"Detailed scraped content: \n {state['scraped_content']}"
    )

    report_result = writer_chain.invoke({
        "topic": topic,
        "research" : research_combined
    })

    state['report_result'] = report_result

    print('\n\n Final report' , report_result)

    # step 4 critic report

    print("\n" , "*" * 50)
    print("step 4 - critic is revewing top resources")
    print("*" * 50)

    state['feedback_result'] =critic_chain.invoke({
        "report" : state['report_result'] 
    })

    print("\n\n Critic report ", state['feedback_result'])

    return state

if __name__ == "__main__":
    topic = input("\n Enter research topics")

    run_research_pipeline(topic=topic)

     




