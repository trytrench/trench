import { Popover } from "@headlessui/react";
import clsx from "clsx";
import { MoreHorizontalIcon } from "lucide-react";

interface CardMenuProps {
  entityId: string;
  isGroup: boolean;
  parentActive: boolean;
}

function CardMenu({ entityId, isGroup }: CardMenuProps) {
  return (
    <Popover className="relative my-0 flex items-center -mr-1">
      {({ open }) => (
        <>
          <Popover.Button
            className={clsx({
              "outline-none p-1 -my-1 rounded-full hover:bg-[rgba(0,0,0,0.05)] bg-blend-multiply transition group":
                true,
              "bg-[rgba(0,0,0,0.05)]": open,
            })}
          >
            <MoreHorizontalIcon
              size={18}
              className="group-hover:text-gray-500 transition"
            />
          </Popover.Button>

          <Popover.Panel className="absolute top-1/2 -translate-y-1/2 z-10 left-full translate-x-3 ml-2 w-[8rem]">
            <div className="flex flex-col bg-white text-gray-700 border rounded-lg drop-shadow-md text-sm overflow-hidden font-semibold">
              <div className="p-2 py-1 hover:bg-gray-50">
                {!isGroup && (
                  <a
                    href={`/entity/${entityId}?tab=1`}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    Visit this entity
                  </a>
                )}
              </div>
            </div>

            <img src="/solutions.jpg" alt="" />
          </Popover.Panel>
        </>
      )}
    </Popover>
  );
}

export default CardMenu;
